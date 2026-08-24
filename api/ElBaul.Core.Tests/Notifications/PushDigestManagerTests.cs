using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Chapters.Domain;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Recuerdos.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Core.Notifications.Domain;
using ElBaul.Core.Notifications.Application;
using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Notifications.OutputPorts;
using ElBaul.Core.Personas.Application;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using Ne2Studio.Common;

using ElBaul.Infra;
using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;
// See WeeklyDigestManagerTests for why this alias exists — UserId (the string constant below)
// shadows the ElBaul.Domain.UserId VO type by name.
using UserIdVo = ElBaul.Domain.UserId;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class PushDigestManagerTests
{
    private const string UserId = "user-1";
    // Distinct from UserId so aggregation tests aren't accidentally exercising the "own
    // contributions excluded" behavior instead of pure aggregation.
    private const string OtherUserId = "other-user";

    private readonly InMemoryUserRepository _userRepository = new();
    private readonly InMemoryPushTokenRepository _pushTokenRepository = new();
    private readonly FakePushNotificationSender _pushNotificationSender = new();
    private readonly InMemorySentPushNotificationRepository _sentPushNotificationRepository = new();
    private readonly FakePushLinkSigner _pushLinkSigner = new();
    private readonly InMemoryPersonaRepository _personaRepository = new();
    private readonly InMemoryBaulRepository _baulRepository;
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly InMemoryBaulFeedCursorRepository _feedCursorRepository = new();
    private readonly FakeBackgroundJobScheduler _jobScheduler = new();
    private readonly StaticAppConfiguration _appConfiguration = new();
    private readonly StaticClock _clock = new();

    public PushDigestManagerTests()
    {
        _baulRepository = new InMemoryBaulRepository(_personaRepository);
    }

    private PushDigestManager CreateManager() => CreateManager(_appConfiguration);

    private PushDigestManager CreateManager(IAppConfiguration appConfiguration) => new(
        NullLogger<PushDigestManager>.Instance,
        _userRepository, _pushTokenRepository, _pushNotificationSender,
        _sentPushNotificationRepository, _pushLinkSigner, new GuidIdGenerator(),
        CreateDigestActivityPolicy(), CreateAttributionResolver(), _feedCursorRepository,
        _jobScheduler, appConfiguration, _clock);

    private DigestActivityPolicy CreateDigestActivityPolicy() => new(
        new BaulAccessService(_baulRepository, _personaRepository, NullLogger<BaulAccessService>.Instance),
        _chapterRepository, _photoRepository, _recuerdoRepository);

    private DigestAttributionResolver CreateAttributionResolver() => new(
        new AuthorInfoProjector(_personaRepository, _photoRepository, new FakePhotoStorage()));

    private User SeedUser(string id, DateTime? lastPushDigestSentAt = null, string email = "user@example.com")
    {
        var user = new User(new UserIdVo(id), email, "Usuaria", _clock.UtcNow().AddDays(-30), LastPushDigestSentAt: lastPushDigestSentAt);
        _userRepository.Seed(user);
        return user;
    }

    private Baul SeedOwnedBaul(string userId, string name = "Familia Pardal")
    {
        var baul = new Baul(new BaulId(Guid.NewGuid()), name, null, new UserIdVo(userId), 0, _clock.UtcNow().AddDays(-30), _clock.UtcNow());
        _baulRepository.CreateAsync(baul).GetAwaiter().GetResult();
        return baul;
    }

    private void SeedToken(string userId, string token = "token-1") =>
        _pushTokenRepository.UpsertAsync(new PushToken(Guid.NewGuid(), new UserIdVo(userId), token, "android", _clock.UtcNow())).GetAwaiter().GetResult();

    private void SeedPersona(BaulId baulId, string userId, string nickname) =>
        _personaRepository.AddPersonaAsync(new Persona(
            new PersonaId(Guid.NewGuid()), baulId, new UserIdVo(userId), nickname, BaulRole.Colaborador, _clock.UtcNow())).GetAwaiter().GetResult();

    // --- Scheduling ----------------------------------------------------------------

    [Fact]
    public async Task ScheduleDailyPushDigestsAsync_ShouldEnqueue_UserWithNoPreviousDigest_UsingOneDayFallback()
    {
        SeedUser(UserId);
        SeedToken(UserId);
        var manager = CreateManager();

        await manager.ScheduleDailyPushDigestsAsync();

        var enqueued = Assert.Single(_jobScheduler.EnqueuedPushDigests);
        Assert.Equal(UserId, enqueued.UserId);
        Assert.Equal(_clock.UtcNow().AddDays(-1), enqueued.Since, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task ScheduleDailyPushDigestsAsync_ShouldNotEnqueue_WhenLastDigestWasLessThanADayAgo()
    {
        SeedUser(UserId, lastPushDigestSentAt: _clock.UtcNow().AddHours(-12));
        SeedToken(UserId);
        var manager = CreateManager();

        await manager.ScheduleDailyPushDigestsAsync();

        Assert.Empty(_jobScheduler.EnqueuedPushDigests);
    }

    [Fact]
    public async Task ScheduleDailyPushDigestsAsync_ShouldEnqueue_WithSinceEqualToLastDigest_WhenOlderThanADay()
    {
        SeedUser(UserId, lastPushDigestSentAt: _clock.UtcNow().AddDays(-3));
        SeedToken(UserId);
        var manager = CreateManager();

        await manager.ScheduleDailyPushDigestsAsync();

        var enqueued = Assert.Single(_jobScheduler.EnqueuedPushDigests);
        Assert.Equal(_clock.UtcNow().AddDays(-3), enqueued.Since);
    }

    [Fact]
    public async Task ScheduleDailyPushDigestsAsync_ShouldNotEnqueue_UsersWithoutAnyRegisteredDevice()
    {
        SeedUser(UserId);
        var manager = CreateManager();

        await manager.ScheduleDailyPushDigestsAsync();

        Assert.Empty(_jobScheduler.EnqueuedPushDigests);
    }

    [Fact]
    public async Task ScheduleDailyPushDigestsAsync_ShouldDoNothing_WhenFeatureDisabled()
    {
        SeedUser(UserId);
        SeedToken(UserId);
        var manager = CreateManager(new StaticAppConfiguration(pushDigestEnabled: false));

        await manager.ScheduleDailyPushDigestsAsync();

        Assert.Empty(_jobScheduler.EnqueuedPushDigests);
    }

    // --- Silence when there's nothing to report --------------------------------------

    [Fact]
    public async Task SendPushDigestAsync_ShouldNotSend_ForUserWithNoBaules()
    {
        SeedUser(UserId);
        SeedToken(UserId);
        var manager = CreateManager();

        await manager.SendPushDigestAsync(new UserIdVo(UserId), _clock.UtcNow().AddDays(-1));

        Assert.Empty(_pushNotificationSender.SentMessages);
    }

    [Fact]
    public async Task SendPushDigestAsync_ShouldNotSend_ForUserWithBaulesButNoActivity()
    {
        SeedUser(UserId);
        SeedOwnedBaul(UserId);
        SeedToken(UserId);
        var manager = CreateManager();

        await manager.SendPushDigestAsync(new UserIdVo(UserId), _clock.UtcNow().AddDays(-1));

        Assert.Empty(_pushNotificationSender.SentMessages);
    }

    [Fact]
    public async Task SendPushDigestAsync_ShouldNotSend_WhenNoRegisteredDevice()
    {
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), new UserIdVo(OtherUserId), "Un recuerdo", _clock.UtcNow()));
        var manager = CreateManager();

        await manager.SendPushDigestAsync(new UserIdVo(UserId), _clock.UtcNow().AddDays(-1));

        Assert.Empty(_pushNotificationSender.SentMessages);
    }

    [Fact]
    public async Task SendPushDigestAsync_ShouldDoNothing_WhenFeatureDisabled()
    {
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        SeedToken(UserId);
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), new UserIdVo(OtherUserId), "Un recuerdo", _clock.UtcNow()));
        var manager = CreateManager(new StaticAppConfiguration(pushDigestEnabled: false));

        await manager.SendPushDigestAsync(new UserIdVo(UserId), _clock.UtcNow().AddDays(-1));

        Assert.Empty(_pushNotificationSender.SentMessages);
    }

    // --- Content: activity aggregation ------------------------------------------------

    [Fact]
    public async Task SendPushDigestAsync_ShouldSummarizeRecuerdosPhotosAndChapters()
    {
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        SeedToken(UserId);
        var since = _clock.UtcNow().AddDays(-1);
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), new UserIdVo(OtherUserId), "Uno", _clock.UtcNow()));
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), new UserIdVo(OtherUserId), "Dos", _clock.UtcNow()));
        await _photoRepository.CreateAsync(PhotoMother.Create(new PhotoId(Guid.NewGuid()), null, new BaulId(baul.Id), "loose-1", null, new UserIdVo(OtherUserId), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(Guid.NewGuid()), new BaulId(baul.Id), "Verano", 0, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), since);

        var message = Assert.Single(_pushNotificationSender.SentMessages);
        Assert.Equal("Hay novedades en tu baúl", message.Title);
        Assert.Contains("2 recuerdos nuevos", message.Body);
        Assert.Contains("1 foto nueva", message.Body);
        Assert.Contains("1 capítulo nuevo", message.Body);
        Assert.Equal($"/baules/{baul.Id}", message.DeepLink);
    }

    [Fact]
    public async Task SendPushDigestAsync_ShouldAggregateAcrossBaules_AndOmitDeepLink_WhenMoreThanOneHasNews()
    {
        SeedUser(UserId);
        var firstBaul = SeedOwnedBaul(UserId, "Uno");
        var secondBaul = SeedOwnedBaul(UserId, "Dos");
        SeedToken(UserId);
        var since = _clock.UtcNow().AddDays(-1);
        _recuerdoRepository.SeedForBaul(firstBaul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(firstBaul.Id), new UserIdVo(OtherUserId), "Uno", _clock.UtcNow()));
        _recuerdoRepository.SeedForBaul(secondBaul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(secondBaul.Id), new UserIdVo(OtherUserId), "Dos", _clock.UtcNow()));

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), since);

        var message = Assert.Single(_pushNotificationSender.SentMessages);
        Assert.Equal("Hay novedades en tus baúles", message.Title);
        Assert.Contains("2 recuerdos nuevos", message.Body);
        Assert.Null(message.DeepLink);
    }

    // --- Content: attribution ----------------------------------------------------------

    [Fact]
    public async Task SendPushDigestAsync_ShouldAttributeBody_ToItsSingleContributor()
    {
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        SeedPersona(baul.Id, OtherUserId, "Tita Loli");
        SeedToken(UserId);
        var since = _clock.UtcNow().AddDays(-1);
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), new UserIdVo(OtherUserId), "Uno", _clock.UtcNow()));
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), new UserIdVo(OtherUserId), "Dos", _clock.UtcNow()));
        await _photoRepository.CreateAsync(PhotoMother.Create(new PhotoId(Guid.NewGuid()), null, new BaulId(baul.Id), "loose-1", null, new UserIdVo(OtherUserId), _clock.UtcNow()));

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), since);

        var message = Assert.Single(_pushNotificationSender.SentMessages);
        Assert.Equal("Tita Loli ha añadido 2 recuerdos nuevos y 1 foto nueva", message.Body);
    }

    [Fact]
    public async Task SendPushDigestAsync_ShouldAttributeBody_ToTopContributorAndOthers_AcrossBaules()
    {
        const string ThirdUserId = "third-user";
        SeedUser(UserId);
        var firstBaul = SeedOwnedBaul(UserId, "Uno");
        var secondBaul = SeedOwnedBaul(UserId, "Dos");
        SeedPersona(firstBaul.Id, OtherUserId, "Tita Loli");
        SeedPersona(secondBaul.Id, OtherUserId, "Tita Loli");
        SeedPersona(secondBaul.Id, ThirdUserId, "Tío Pepe");
        SeedToken(UserId);
        var since = _clock.UtcNow().AddDays(-1);
        // Tita Loli contributes in both baúles (2 items total); Tío Pepe contributes 1 -> Tita
        // Loli is named as the top contributor, across baúles.
        _recuerdoRepository.SeedForBaul(firstBaul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(firstBaul.Id), new UserIdVo(OtherUserId), "Uno", _clock.UtcNow()));
        _recuerdoRepository.SeedForBaul(secondBaul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(secondBaul.Id), new UserIdVo(OtherUserId), "Dos", _clock.UtcNow()));
        _recuerdoRepository.SeedForBaul(secondBaul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(secondBaul.Id), new UserIdVo(ThirdUserId), "Tres", _clock.UtcNow()));

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), since);

        var message = Assert.Single(_pushNotificationSender.SentMessages);
        Assert.Equal("Tita Loli y otros han añadido 3 recuerdos nuevos", message.Body);
    }

    [Fact]
    public async Task SendPushDigestAsync_ShouldAttributeBody_ToUsuario_WhenContributorsPersonaCannotBeResolved()
    {
        // OtherUserId has no Persona seeded in this baúl -> AuthorInfoProjector's "Usuario"
        // fallback applies, same as it does for every other authorship display in the app.
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        SeedToken(UserId);
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), new UserIdVo(OtherUserId), "Uno", _clock.UtcNow()));

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), _clock.UtcNow().AddDays(-1));

        var message = Assert.Single(_pushNotificationSender.SentMessages);
        Assert.Equal("Usuario ha añadido 1 recuerdo nuevo", message.Body);
    }

    [Fact]
    public async Task SendPushDigestAsync_ShouldExcludeRecuerdos_TheRecipientThemselvesAuthored()
    {
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        SeedToken(UserId);
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), new UserIdVo(UserId), "Mío", _clock.UtcNow()));

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), _clock.UtcNow().AddDays(-1));

        Assert.Empty(_pushNotificationSender.SentMessages);
    }

    [Fact]
    public async Task SendPushDigestAsync_ShouldNotIncludeBaules_TheUserNoLongerHasAccessTo()
    {
        SeedUser(UserId);
        var owner = SeedUser("owner-1", email: "owner@example.com");
        var baul = SeedOwnedBaul(owner.Id, "Baúl ajeno");
        SeedToken(UserId);
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), new UserIdVo(OtherUserId), "Recuerdo", _clock.UtcNow()));

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), _clock.UtcNow().AddDays(-1));

        Assert.Empty(_pushNotificationSender.SentMessages);
    }

    // --- Delivery + cursor -------------------------------------------------------------

    [Fact]
    public async Task SendPushDigestAsync_ShouldSendToEveryRegisteredToken()
    {
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        SeedToken(UserId, "token-a");
        SeedToken(UserId, "token-b");
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), new UserIdVo(OtherUserId), "Recuerdo", _clock.UtcNow()));

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), _clock.UtcNow().AddDays(-1));

        Assert.Equal(2, _pushNotificationSender.SentMessages.Count);
        Assert.Contains(_pushNotificationSender.SentMessages, m => m.Token == "token-a");
        Assert.Contains(_pushNotificationSender.SentMessages, m => m.Token == "token-b");
    }

    [Fact]
    public async Task SendPushDigestAsync_ShouldAdvanceCursor_WhenSendSucceeds()
    {
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        SeedToken(UserId);
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), new UserIdVo(OtherUserId), "Recuerdo", _clock.UtcNow()));

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), _clock.UtcNow().AddDays(-1));

        var user = await _userRepository.GetByIdAsync(new UserIdVo(UserId));
        Assert.Equal(_clock.UtcNow(), user!.LastPushDigestSentAt);
    }

    [Fact]
    public async Task SendPushDigestAsync_ShouldNotAdvanceCursor_WhenNoActivity()
    {
        SeedUser(UserId, lastPushDigestSentAt: _clock.UtcNow().AddDays(-5));
        SeedOwnedBaul(UserId);
        SeedToken(UserId);

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), _clock.UtcNow().AddDays(-1));

        var user = await _userRepository.GetByIdAsync(new UserIdVo(UserId));
        Assert.Equal(_clock.UtcNow().AddDays(-5), user!.LastPushDigestSentAt);
    }

    [Fact]
    public async Task SendPushDigestAsync_ShouldNotAdvanceCursor_WhenEverySendFails()
    {
        SeedUser(UserId, lastPushDigestSentAt: _clock.UtcNow().AddDays(-5));
        var baul = SeedOwnedBaul(UserId);
        SeedToken(UserId);
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), new UserIdVo(OtherUserId), "Recuerdo", _clock.UtcNow()));
        _pushNotificationSender.NextResult = Result.Failure(ApplicationError.ExternalDependencyUnavailable("boom"));

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), _clock.UtcNow().AddDays(-1));

        var user = await _userRepository.GetByIdAsync(new UserIdVo(UserId));
        Assert.Equal(_clock.UtcNow().AddDays(-5), user!.LastPushDigestSentAt);
    }

    // --- Per-baúl cutoff: activity already seen in-app never gets pushed ---------------

    [Fact]
    public async Task SendPushDigestAsync_ShouldExcludeActivity_AlreadySeenInAppForThatBaul()
    {
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        SeedToken(UserId);
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), new UserIdVo(OtherUserId), "Recuerdo", _clock.UtcNow()));
        // The user opened this baúl's feed strictly after the recuerdo was created —
        // BaulFeedManager would have advanced the cursor past it at that point. GetCreatedSince*
        // is inclusive (>=), same as every other digest cursor in this codebase, so the floor
        // must be strictly later than the activity to exclude it, not merely equal to it.
        await _feedCursorRepository.UpsertAsync(new UserIdVo(UserId), baul.Id, _clock.UtcNow().AddSeconds(1));

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), _clock.UtcNow().AddDays(-1));

        Assert.Empty(_pushNotificationSender.SentMessages);
    }

    [Fact]
    public async Task SendPushDigestAsync_ShouldIncludeActivity_CreatedAfterLastSeenInAppForThatBaul()
    {
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        SeedToken(UserId);
        // The user last opened this baúl well before the digest window even starts — the global
        // `since` should still be the binding floor, not this stale in-app cursor.
        await _feedCursorRepository.UpsertAsync(new UserIdVo(UserId), baul.Id, _clock.UtcNow().AddDays(-10));
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), new UserIdVo(OtherUserId), "Recuerdo", _clock.UtcNow()));

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), _clock.UtcNow().AddDays(-1));

        var message = Assert.Single(_pushNotificationSender.SentMessages);
        Assert.Contains("1 recuerdo nuevo", message.Body);
    }

    [Fact]
    public async Task SendPushDigestAsync_ShouldOnlyClampTheBaul_TheCursorBelongsTo()
    {
        SeedUser(UserId);
        var seenBaul = SeedOwnedBaul(UserId, "Visto");
        var unseenBaul = SeedOwnedBaul(UserId, "No visto");
        SeedToken(UserId);
        _recuerdoRepository.SeedForBaul(seenBaul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(seenBaul.Id), new UserIdVo(OtherUserId), "Visto", _clock.UtcNow()));
        _recuerdoRepository.SeedForBaul(unseenBaul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(unseenBaul.Id), new UserIdVo(OtherUserId), "No visto", _clock.UtcNow()));
        await _feedCursorRepository.UpsertAsync(new UserIdVo(UserId), seenBaul.Id, _clock.UtcNow().AddSeconds(1));

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), _clock.UtcNow().AddDays(-1));

        var message = Assert.Single(_pushNotificationSender.SentMessages);
        Assert.Equal($"/baules/{unseenBaul.Id}", message.DeepLink);
        Assert.Contains("1 recuerdo nuevo", message.Body);
    }
}
