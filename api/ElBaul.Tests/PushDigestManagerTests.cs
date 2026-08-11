using ElBaul.Application.Notifications;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Notifications;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Users;
using ElBaul.Shared;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;
// See WeeklyDigestManagerTests for why this alias exists — UserId (the string constant below)
// shadows the ElBaul.OutputPorts.Users.UserId VO type by name.
using UserIdVo = ElBaul.OutputPorts.Users.UserId;

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
    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly FakeBackgroundJobScheduler _jobScheduler = new();
    private readonly StaticAppConfiguration _appConfiguration = new();
    private readonly StaticClock _clock = new();

    private PushDigestManager CreateManager() => CreateManager(_appConfiguration);

    private PushDigestManager CreateManager(IAppConfiguration appConfiguration) => new(
        NullLogger<PushDigestManager>.Instance,
        _userRepository, _pushTokenRepository, _pushNotificationSender,
        _baulRepository, _chapterRepository, _photoRepository, _recuerdoRepository,
        _jobScheduler, appConfiguration, _clock);

    private User SeedUser(string id, DateTime? lastPushDigestSentAt = null, string email = "user@example.com")
    {
        var user = new User(id, email, "Usuaria", _clock.UtcNow().AddDays(-30), LastPushDigestSentAt: lastPushDigestSentAt);
        _userRepository.Seed(user);
        return user;
    }

    private Baul SeedOwnedBaul(string userId, string name = "Familia Pardal")
    {
        var baul = new Baul(new BaulId(Guid.NewGuid()), name, null, userId, 0, _clock.UtcNow().AddDays(-30), _clock.UtcNow());
        _baulRepository.CreateAsync(baul).GetAwaiter().GetResult();
        return baul;
    }

    private void SeedToken(string userId, string token = "token-1") =>
        _pushTokenRepository.UpsertAsync(new PushToken(Guid.NewGuid(), userId, token, "android", _clock.UtcNow())).GetAwaiter().GetResult();

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
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), OtherUserId, "Un recuerdo", _clock.UtcNow()));
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
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), OtherUserId, "Un recuerdo", _clock.UtcNow()));
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
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), OtherUserId, "Uno", _clock.UtcNow()));
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), OtherUserId, "Dos", _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), null, new BaulId(baul.Id), "loose-1", null, OtherUserId, _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(Guid.NewGuid()), new BaulId(baul.Id), "Verano", 0, null, _clock.UtcNow(), _clock.UtcNow()));

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
        _recuerdoRepository.SeedForBaul(firstBaul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(firstBaul.Id), OtherUserId, "Uno", _clock.UtcNow()));
        _recuerdoRepository.SeedForBaul(secondBaul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(secondBaul.Id), OtherUserId, "Dos", _clock.UtcNow()));

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), since);

        var message = Assert.Single(_pushNotificationSender.SentMessages);
        Assert.Equal("Hay novedades en tus baúles", message.Title);
        Assert.Contains("2 recuerdos nuevos", message.Body);
        Assert.Null(message.DeepLink);
    }

    [Fact]
    public async Task SendPushDigestAsync_ShouldExcludeRecuerdos_TheRecipientThemselvesAuthored()
    {
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        SeedToken(UserId);
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), UserId, "Mío", _clock.UtcNow()));

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
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), OtherUserId, "Recuerdo", _clock.UtcNow()));

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
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), OtherUserId, "Recuerdo", _clock.UtcNow()));

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
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), OtherUserId, "Recuerdo", _clock.UtcNow()));

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), _clock.UtcNow().AddDays(-1));

        var user = await _userRepository.GetByIdAsync(UserId);
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

        var user = await _userRepository.GetByIdAsync(UserId);
        Assert.Equal(_clock.UtcNow().AddDays(-5), user!.LastPushDigestSentAt);
    }

    [Fact]
    public async Task SendPushDigestAsync_ShouldNotAdvanceCursor_WhenEverySendFails()
    {
        SeedUser(UserId, lastPushDigestSentAt: _clock.UtcNow().AddDays(-5));
        var baul = SeedOwnedBaul(UserId);
        SeedToken(UserId);
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baul.Id), OtherUserId, "Recuerdo", _clock.UtcNow()));
        _pushNotificationSender.NextResult = Result.Failure(ApplicationError.ExternalDependencyUnavailable("boom"));

        var manager = CreateManager();
        await manager.SendPushDigestAsync(new UserIdVo(UserId), _clock.UtcNow().AddDays(-1));

        var user = await _userRepository.GetByIdAsync(UserId);
        Assert.Equal(_clock.UtcNow().AddDays(-5), user!.LastPushDigestSentAt);
    }
}
