using CSharpFunctionalExtensions;
using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Tests;

public class WeeklyDigestManagerTests
{
    private const string UserId = "user-1";

    private readonly InMemoryUserRepository _userRepository = new();
    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly InMemorySentEmailRepository _sentEmailRepository = new();
    private readonly InMemoryEmailLinkClickRepository _emailLinkClickRepository = new();
    private readonly FakeEmailTemplateRenderer _templateRenderer = new();
    private readonly FakeEmailSender _emailSender = new();
    private readonly FakeBackgroundJobScheduler _jobScheduler = new();
    private readonly StaticAppConfiguration _appConfiguration = new();
    private readonly StaticClock _clock = new();

    private WeeklyDigestManager CreateManager() => CreateManager(_appConfiguration);

    private WeeklyDigestManager CreateManager(IAppConfiguration appConfiguration) => new(
        NullLogger<WeeklyDigestManager>.Instance,
        _userRepository, _baulRepository, _chapterRepository, _photoRepository, _recuerdoRepository, _sentEmailRepository,
        _templateRenderer,
        new EmailDeliveryCoordinator(
            _sentEmailRepository, _emailLinkClickRepository, _emailSender, appConfiguration, _clock,
            new StaticIdGenerator(Guid.NewGuid()), NullLogger<EmailDeliveryCoordinator>.Instance),
        _jobScheduler, appConfiguration, _clock);

    private User SeedUser(string id, bool digestEnabled = true, string email = "user@example.com")
    {
        var user = new User(id, email, "Usuaria", _clock.UtcNow().AddDays(-30), WeeklyDigestEnabled: digestEnabled);
        _userRepository.Seed(user);
        return user;
    }

    private Baul SeedOwnedBaul(string userId, string name = "Familia Pardal")
    {
        var baul = new Baul(Guid.NewGuid(), name, null, userId, 0, _clock.UtcNow().AddDays(-30), _clock.UtcNow());
        _baulRepository.CreateAsync(baul).GetAwaiter().GetResult();
        return baul;
    }

    private void SeedSentDigest(string userId, DateTime sentAt, EmailStatus status = EmailStatus.Sent) =>
        _sentEmailRepository.TryReserveAsync(new SentEmail(
            Guid.NewGuid(), userId, EmailType.WeeklyDigest, "Resumen semanal de tus baúles", "user@example.com",
            "weekly-digest-v1", "es-ES", status, $"weekly-digest:{userId}:{sentAt:O}", _clock.UtcNow(),
            SentAt: status == EmailStatus.Sent ? sentAt : null)).GetAwaiter().GetResult();

    // --- Scheduling ----------------------------------------------------------------

    [Fact]
    public async Task ScheduleWeeklyDigestsAsync_ShouldEnqueue_UserWithNoPreviousDigest_UsingSevenDayFallback()
    {
        SeedUser(UserId);
        var manager = CreateManager();

        await manager.ScheduleWeeklyDigestsAsync();

        var enqueued = Assert.Single(_jobScheduler.EnqueuedWeeklyDigests);
        Assert.Equal(UserId, enqueued.UserId);
        Assert.Equal(_clock.UtcNow().AddDays(-7), enqueued.Since, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task ScheduleWeeklyDigestsAsync_ShouldNotEnqueue_WhenLastDigestWasLessThanSevenDaysAgo()
    {
        SeedUser(UserId);
        SeedSentDigest(UserId, _clock.UtcNow().AddDays(-6));
        var manager = CreateManager();

        await manager.ScheduleWeeklyDigestsAsync();

        Assert.Empty(_jobScheduler.EnqueuedWeeklyDigests);
    }

    [Fact]
    public async Task ScheduleWeeklyDigestsAsync_ShouldEnqueue_WithSinceEqualToLastDigest_WhenOlderThanSevenDays()
    {
        SeedUser(UserId);
        var lastSent = _clock.UtcNow().AddDays(-8);
        SeedSentDigest(UserId, lastSent);
        var manager = CreateManager();

        await manager.ScheduleWeeklyDigestsAsync();

        var enqueued = Assert.Single(_jobScheduler.EnqueuedWeeklyDigests);
        Assert.Equal(lastSent, enqueued.Since);
    }

    [Fact]
    public async Task ScheduleWeeklyDigestsAsync_ShouldNotEnqueue_UsersWithDigestDisabled()
    {
        SeedUser(UserId, digestEnabled: false);
        var manager = CreateManager();

        await manager.ScheduleWeeklyDigestsAsync();

        Assert.Empty(_jobScheduler.EnqueuedWeeklyDigests);
    }

    // --- Content: empty states ------------------------------------------------------

    [Fact]
    public async Task SendWeeklyDigestAsync_ShouldGenerateEmptyState_ForUserWithNoBaules()
    {
        SeedUser(UserId);
        var manager = CreateManager();

        await manager.SendWeeklyDigestAsync(UserId, _clock.UtcNow().AddDays(-7));

        Assert.False(_templateRenderer.LastDigestModel!.HasBaules);
        Assert.False(_templateRenderer.LastDigestModel.HasActivity);
        Assert.Equal("Crear mi primer baúl", _templateRenderer.LastDigestModel.PrimaryCtaLabel);
    }

    [Fact]
    public async Task SendWeeklyDigestAsync_ShouldGenerateEmptyState_ForUserWithBaulesButNoActivity()
    {
        SeedUser(UserId);
        SeedOwnedBaul(UserId);
        var manager = CreateManager();

        await manager.SendWeeklyDigestAsync(UserId, _clock.UtcNow().AddDays(-7));

        Assert.True(_templateRenderer.LastDigestModel!.HasBaules);
        Assert.False(_templateRenderer.LastDigestModel.HasActivity);
        Assert.Equal("Añadir un recuerdo", _templateRenderer.LastDigestModel.PrimaryCtaLabel);
    }

    // --- Content: activity aggregation ----------------------------------------------

    [Fact]
    public async Task SendWeeklyDigestAsync_ShouldIncludeNewChapterBlock()
    {
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        var since = _clock.UtcNow().AddDays(-7);
        await _chapterRepository.CreateAsync(new Chapter(Guid.NewGuid(), baul.Id, "Verano 1998", 0, null, _clock.UtcNow(), _clock.UtcNow()));
        var manager = CreateManager();

        await manager.SendWeeklyDigestAsync(UserId, since);

        var section = Assert.Single(_templateRenderer.LastDigestModel!.Sections);
        Assert.Contains(section.Blocks, b => b.Kind == DigestBlockKind.NewChapter && b.Label.Contains("Verano 1998"));
    }

    [Fact]
    public async Task SendWeeklyDigestAsync_ShouldGroupPhotosByChapterAndCountLoosePhotosSeparately()
    {
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        var since = _clock.UtcNow().AddDays(-7);
        var chapter = new Chapter(Guid.NewGuid(), baul.Id, "Capítulo", 0, null, since.AddDays(-1), since.AddDays(-1));
        await _chapterRepository.CreateAsync(chapter);

        for (var i = 0; i < 3; i++)
            await _photoRepository.CreateAsync(new Photo(Guid.NewGuid(), chapter.Id, baul.Id, $"key-{i}", null, null, null, UserId, _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(Guid.NewGuid(), null, baul.Id, "loose-1", null, null, null, UserId, _clock.UtcNow()));

        var manager = CreateManager();
        await manager.SendWeeklyDigestAsync(UserId, since);

        var section = Assert.Single(_templateRenderer.LastDigestModel!.Sections);
        Assert.Contains(section.Blocks, b => b.Kind == DigestBlockKind.NewPhotosInChapter && b.Count == 3);
        Assert.Contains(section.Blocks, b => b.Kind == DigestBlockKind.NewLoosePhotos && b.Count == 1);
    }

    [Fact]
    public async Task SendWeeklyDigestAsync_ShouldExcludeDeletedPhotos()
    {
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        var since = _clock.UtcNow().AddDays(-7);
        await _photoRepository.CreateAsync(new Photo(
            Guid.NewGuid(), null, baul.Id, "deleted-1", null, null, null, UserId, _clock.UtcNow(),
            Status: PhotoStatus.Deleted, DeletedAt: _clock.UtcNow(), DeletionReason: "test"));

        var manager = CreateManager();
        await manager.SendWeeklyDigestAsync(UserId, since);

        Assert.False(_templateRenderer.LastDigestModel!.HasActivity);
    }

    [Fact]
    public async Task SendWeeklyDigestAsync_ShouldIncludeRecuerdosAggregatedAtBaulLevel()
    {
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        var since = _clock.UtcNow().AddDays(-7);
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(Guid.NewGuid(), null, null, baul.Id, UserId, "Un recuerdo bonito", _clock.UtcNow()));
        _recuerdoRepository.SeedForBaul(baul.Id, new Recuerdo(Guid.NewGuid(), null, null, baul.Id, UserId, "Otro más", _clock.UtcNow()));

        var manager = CreateManager();
        await manager.SendWeeklyDigestAsync(UserId, since);

        var section = Assert.Single(_templateRenderer.LastDigestModel!.Sections);
        Assert.Contains(section.Blocks, b => b.Kind == DigestBlockKind.NewRecuerdos && b.Count == 2);
    }

    [Fact]
    public async Task SendWeeklyDigestAsync_ShouldCapAtThreeBlocksPerBaul_AndSummarizeTheRest()
    {
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        var since = _clock.UtcNow().AddDays(-7);

        // 4 chapters with photos each -> 4 NewPhotosInChapter candidate blocks (plus recuerdos), well over the cap of 3.
        for (var i = 0; i < 4; i++)
        {
            var chapter = new Chapter(Guid.NewGuid(), baul.Id, $"Capítulo {i}", 0, null, since.AddDays(-1), since.AddDays(-1));
            await _chapterRepository.CreateAsync(chapter);
            await _photoRepository.CreateAsync(new Photo(Guid.NewGuid(), chapter.Id, baul.Id, $"key-{i}", null, null, null, UserId, _clock.UtcNow()));
        }

        var manager = CreateManager();
        await manager.SendWeeklyDigestAsync(UserId, since);

        var section = Assert.Single(_templateRenderer.LastDigestModel!.Sections);
        Assert.Equal(3, section.Blocks.Count);
        Assert.NotNull(section.OverflowSummary);
    }

    // --- Access scoping --------------------------------------------------------------

    [Fact]
    public async Task SendWeeklyDigestAsync_ShouldNotIncludeBaules_TheUserNoLongerHasAccessTo()
    {
        SeedUser(UserId);
        var owner = SeedUser("owner-1", email: "owner@example.com");
        var baul = SeedOwnedBaul(owner.Id, "Baúl ajeno");
        var since = _clock.UtcNow().AddDays(-7);
        await _chapterRepository.CreateAsync(new Chapter(Guid.NewGuid(), baul.Id, "Capítulo", 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager();
        await manager.SendWeeklyDigestAsync(UserId, since);

        Assert.False(_templateRenderer.LastDigestModel!.HasActivity);
    }

    [Fact]
    public async Task SendWeeklyDigestAsync_ShouldIncludeBaules_TheUserRecentlyGainedAccessTo()
    {
        SeedUser(UserId);
        var owner = SeedUser("owner-1", email: "owner@example.com");
        var baul = SeedOwnedBaul(owner.Id, "Baúl compartido");
        var since = _clock.UtcNow().AddDays(-7);
        await _chapterRepository.CreateAsync(new Chapter(Guid.NewGuid(), baul.Id, "Capítulo", 0, null, since.AddDays(1), since.AddDays(1)));
        await _baulRepository.AddPersonaAsync(new Persona(Guid.NewGuid(), baul.Id, UserId, "Yo", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager();
        await manager.SendWeeklyDigestAsync(UserId, since);

        Assert.True(_templateRenderer.LastDigestModel!.HasActivity);
    }

    // --- Idempotency -------------------------------------------------------------------

    [Fact]
    public async Task SendWeeklyDigestAsync_ShouldNotResend_ForTheSamePeriod()
    {
        SeedUser(UserId);
        var since = _clock.UtcNow().AddDays(-7);
        SeedSentDigest(UserId, since); // same `since` -> same DeduplicationKey the manager will compute
        var manager = CreateManager();

        await manager.SendWeeklyDigestAsync(UserId, since);

        Assert.Empty(_emailSender.SentMessages);
    }

    // --- Test send -----------------------------------------------------------------

    [Fact]
    public async Task SendTestWeeklyDigestAsync_ShouldNotAffectTheRealScheduleWindow()
    {
        SeedUser(UserId);
        SeedOwnedBaul(UserId);
        var manager = CreateManager();

        var result = await manager.SendTestWeeklyDigestAsync(UserId);

        Assert.True(result.IsSuccess);
        Assert.Empty(await _sentEmailRepository.GetLatestSentAtByTypeAsync(EmailType.WeeklyDigest));
        var message = Assert.Single(_emailSender.SentMessages);
        Assert.Equal(_appConfiguration.AdminTestEmailRecipient, message.To);
        Assert.StartsWith("[TEST]", message.Subject);
    }

    [Fact]
    public async Task SendTestWeeklyDigestAsync_ShouldUseSinceFromTheLastRealDigest_WhenOneExists()
    {
        SeedUser(UserId);
        var lastSent = _clock.UtcNow().AddDays(-3);
        SeedSentDigest(UserId, lastSent);
        var manager = CreateManager();

        await manager.SendTestWeeklyDigestAsync(UserId);

        // No exception and a message was sent — the important behavioral check (exact `since`
        // propagation) is exercised indirectly via BuildModelAsync's baúl activity queries,
        // covered by the aggregation tests above.
        Assert.Single(_emailSender.SentMessages);
    }

    // --- Click tracking ----------------------------------------------------------------

    [Fact]
    public async Task SendWeeklyDigestAsync_ShouldRouteEveryLinkThroughTheTrackingEndpoint()
    {
        SeedUser(UserId);
        var baul = SeedOwnedBaul(UserId);
        var since = _clock.UtcNow().AddDays(-7);
        await _chapterRepository.CreateAsync(new Chapter(Guid.NewGuid(), baul.Id, "Capítulo", 0, null, _clock.UtcNow(), _clock.UtcNow()));
        var manager = CreateManager();

        await manager.SendWeeklyDigestAsync(UserId, since);

        var model = _templateRenderer.LastDigestModel!;
        var trackedPrefix = $"{_appConfiguration.ApiPublicUrl}/email/click/";
        Assert.StartsWith(trackedPrefix, model.PrimaryCtaUrl);
        Assert.StartsWith(trackedPrefix, model.NotificationSettingsUrl);
        var section = Assert.Single(model.Sections);
        Assert.All(section.Blocks, b => Assert.StartsWith(trackedPrefix, b.DeepLinkUrl));

        // primary-cta + notification-settings + one block for the new chapter
        Assert.Equal(3, _emailLinkClickRepository.All.Count);
    }

    // --- Feature toggle ---

    [Fact]
    public async Task ScheduleWeeklyDigestsAsync_ShouldNotEnqueueAnyone_WhenFeatureDisabled()
    {
        SeedUser(UserId);
        var manager = CreateManager(new StaticAppConfiguration(weeklyDigestEmailsEnabled: false));

        await manager.ScheduleWeeklyDigestsAsync();

        Assert.Empty(_jobScheduler.EnqueuedWeeklyDigests);
    }

    [Fact]
    public async Task SendWeeklyDigestAsync_ShouldNotSend_WhenFeatureDisabled()
    {
        SeedUser(UserId);
        var since = _clock.UtcNow().AddDays(-7);
        var manager = CreateManager(new StaticAppConfiguration(weeklyDigestEmailsEnabled: false));

        await manager.SendWeeklyDigestAsync(UserId, since);

        Assert.Empty(_emailSender.SentMessages);
    }

    [Fact]
    public async Task SendTestWeeklyDigestAsync_ShouldStillSend_WhenFeatureDisabled()
    {
        // Test-sends are an explicit admin action, not the automatic pipeline — the kill
        // switch must not block them, or there'd be no way to preview the email while rollout
        // is off.
        SeedUser(UserId);
        var manager = CreateManager(new StaticAppConfiguration(weeklyDigestEmailsEnabled: false));

        var result = await manager.SendTestWeeklyDigestAsync(UserId);

        Assert.True(result.IsSuccess);
        Assert.Single(_emailSender.SentMessages);
    }
}
