using CSharpFunctionalExtensions;
using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Tests;

public class WelcomeEmailManagerTests
{
    private const string UserId = "user-1";

    private readonly InMemoryUserRepository _userRepository = new();
    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemorySentEmailRepository _sentEmailRepository = new();
    private readonly InMemoryEmailLinkClickRepository _emailLinkClickRepository = new();
    private readonly FakeEmailTemplateRenderer _templateRenderer = new();
    private readonly FakeEmailSender _emailSender = new();
    private readonly FakeBackgroundJobScheduler _jobScheduler = new();
    private readonly StaticAppConfiguration _appConfiguration = new();
    private readonly StaticClock _clock = new();

    private EmailDeliveryCoordinator CreateCoordinator() => new(
        _sentEmailRepository, _emailLinkClickRepository, _emailSender, _appConfiguration, _clock,
        new StaticIdGenerator(Guid.NewGuid()), NullLogger<EmailDeliveryCoordinator>.Instance);

    private WelcomeEmailManager CreateManager() => CreateManager(_appConfiguration);

    private WelcomeEmailManager CreateManager(IAppConfiguration appConfiguration) => new(
        NullLogger<WelcomeEmailManager>.Instance,
        _userRepository, _baulRepository, _sentEmailRepository,
        _templateRenderer, CreateCoordinator(), _jobScheduler, appConfiguration, _clock);

    private User SeedUser(string id, DateTime createdAt, string email = "user@example.com")
    {
        var user = new User(id, email, "Usuaria", createdAt);
        _userRepository.Seed(user);
        return user;
    }

    // --- Scheduling / eligibility -----------------------------------------------------

    [Fact]
    public async Task SchedulePendingWelcomeEmailsAsync_ShouldEnqueue_UsersRegisteredMoreThanTwoHoursAgo()
    {
        SeedUser(UserId, _clock.UtcNow().AddHours(-3));
        var manager = CreateManager();

        await manager.SchedulePendingWelcomeEmailsAsync();

        Assert.Contains(UserId, _jobScheduler.EnqueuedWelcomeEmailUserIds);
    }

    [Fact]
    public async Task SchedulePendingWelcomeEmailsAsync_ShouldNotEnqueue_UsersRegisteredLessThanTwoHoursAgo()
    {
        SeedUser(UserId, _clock.UtcNow().AddHours(-1));
        var manager = CreateManager();

        await manager.SchedulePendingWelcomeEmailsAsync();

        Assert.DoesNotContain(UserId, _jobScheduler.EnqueuedWelcomeEmailUserIds);
    }

    [Fact]
    public async Task SchedulePendingWelcomeEmailsAsync_ShouldNotEnqueue_UsersWhoAlreadyReceivedAWelcomeEmail()
    {
        SeedUser(UserId, _clock.UtcNow().AddHours(-3));
        await _sentEmailRepository.TryReserveAsync(new SentEmail(
            Guid.NewGuid(), UserId, EmailType.Welcome, "Bienvenido a El Baúl", "user@example.com",
            "welcome-v1", "es-ES", EmailStatus.Sent, $"welcome:{UserId}", _clock.UtcNow()));
        var manager = CreateManager();

        await manager.SchedulePendingWelcomeEmailsAsync();

        Assert.DoesNotContain(UserId, _jobScheduler.EnqueuedWelcomeEmailUserIds);
    }

    [Fact]
    public async Task SchedulePendingWelcomeEmailsAsync_ShouldRetry_UsersWhoseOnlyPreviousAttemptFailed()
    {
        // Regression test: a Failed row (e.g. a Resend 429 rate-limit response) must not look
        // like "already sent" to the scheduler, or that user would never be retried again once
        // Hangfire's own bounded automatic-retry attempts run out.
        SeedUser(UserId, _clock.UtcNow().AddHours(-3));
        await _sentEmailRepository.TryReserveAsync(new SentEmail(
            Guid.NewGuid(), UserId, EmailType.Welcome, "Bienvenido a El Baúl", "user@example.com",
            "welcome-v1", "es-ES", EmailStatus.Failed, $"welcome:{UserId}", _clock.UtcNow(),
            ErrorMessage: "Resend returned TooManyRequests"));
        var manager = CreateManager();

        await manager.SchedulePendingWelcomeEmailsAsync();

        Assert.Contains(UserId, _jobScheduler.EnqueuedWelcomeEmailUserIds);
    }

    [Fact]
    public async Task SchedulePendingWelcomeEmailsAsync_ShouldNotEnqueue_UsersWithInvalidEmail()
    {
        SeedUser(UserId, _clock.UtcNow().AddHours(-3), email: "not-an-email");
        var manager = CreateManager();

        await manager.SchedulePendingWelcomeEmailsAsync();

        Assert.DoesNotContain(UserId, _jobScheduler.EnqueuedWelcomeEmailUserIds);
    }

    [Fact]
    public async Task SchedulePendingWelcomeEmailsAsync_ShouldNotEnqueue_UsersBlockedByTheProvider()
    {
        SeedUser(UserId, _clock.UtcNow().AddHours(-3));
        await _sentEmailRepository.TryReserveAsync(new SentEmail(
            Guid.NewGuid(), UserId, EmailType.Welcome, "s", "user@example.com",
            "welcome-v1", "es-ES", EmailStatus.Bounced, "welcome:some-other-attempt", _clock.UtcNow()));
        var manager = CreateManager();

        await manager.SchedulePendingWelcomeEmailsAsync();

        Assert.DoesNotContain(UserId, _jobScheduler.EnqueuedWelcomeEmailUserIds);
    }

    // --- Sending / content variants ------------------------------------------------

    [Fact]
    public async Task SendWelcomeEmailAsync_ShouldSend_ForAnEligibleUser()
    {
        SeedUser(UserId, _clock.UtcNow().AddHours(-3));
        var manager = CreateManager();

        await manager.SendWelcomeEmailAsync(UserId);

        Assert.Single(_emailSender.SentMessages);
        var sentEmail = Assert.Single(_sentEmailRepository.All);
        Assert.Equal(EmailStatus.Sent, sentEmail.Status);
        Assert.Equal("fake-message-id", sentEmail.ProviderMessageId);
    }

    [Fact]
    public async Task SendWelcomeEmailAsync_ShouldUseTheBaulesVariant_ForAUserWithBaules()
    {
        SeedUser(UserId, _clock.UtcNow().AddHours(-3));
        var baul = new Baul(new BaulId(Guid.NewGuid()), "Familia Pardal", null, UserId, 0, _clock.UtcNow(), _clock.UtcNow());
        await _baulRepository.CreateAsync(baul);
        var manager = CreateManager();

        await manager.SendWelcomeEmailAsync(UserId);

        Assert.NotNull(_templateRenderer.LastModel);
        Assert.True(_templateRenderer.LastModel!.HasBaules);
        Assert.Equal("Añadir un recuerdo", _templateRenderer.LastModel.PrimaryCtaLabel);
        Assert.Contains(baul.Id.ToString(), ResolveTrackedDestination(_templateRenderer.LastModel.PrimaryCtaUrl));
        Assert.Contains("Familia Pardal", _templateRenderer.LastModel.BaulNames);
    }

    [Fact]
    public async Task SendWelcomeEmailAsync_ShouldIncludeSharedBaules_NotJustOwnedOnes()
    {
        SeedUser(UserId, _clock.UtcNow().AddHours(-3));
        var custodio = SeedUser("custodio-1", _clock.UtcNow().AddHours(-10));
        var baul = new Baul(new BaulId(Guid.NewGuid()), "Familia Jimena", null, custodio.Id, 0, _clock.UtcNow(), _clock.UtcNow());
        await _baulRepository.CreateAsync(baul);
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baul.Id), UserId, "Yo", BaulRole.Colaborador, _clock.UtcNow()));
        var manager = CreateManager();

        await manager.SendWelcomeEmailAsync(UserId);

        Assert.Contains("Familia Jimena", _templateRenderer.LastModel!.BaulNames);
    }

    [Fact]
    public async Task SendWelcomeEmailAsync_ShouldUseTheNoBaulesVariant_ForAUserWithoutBaules()
    {
        SeedUser(UserId, _clock.UtcNow().AddHours(-3));
        var manager = CreateManager();

        await manager.SendWelcomeEmailAsync(UserId);

        Assert.False(_templateRenderer.LastModel!.HasBaules);
        Assert.Equal("Crear mi primer baúl", _templateRenderer.LastModel.PrimaryCtaLabel);
        Assert.Contains("/baules/nuevo", Uri.UnescapeDataString(ResolveTrackedDestination(_templateRenderer.LastModel.PrimaryCtaUrl)));
    }

    // --- Idempotency / concurrency ---------------------------------------------------

    [Fact]
    public async Task SendWelcomeEmailAsync_ShouldNotResend_WhenAlreadySent()
    {
        SeedUser(UserId, _clock.UtcNow().AddHours(-3));
        await _sentEmailRepository.TryReserveAsync(new SentEmail(
            Guid.NewGuid(), UserId, EmailType.Welcome, "Bienvenido a El Baúl", "user@example.com",
            "welcome-v1", "es-ES", EmailStatus.Sent, $"welcome:{UserId}", _clock.UtcNow()));
        var manager = CreateManager();

        await manager.SendWelcomeEmailAsync(UserId);

        Assert.Empty(_emailSender.SentMessages);
    }

    [Fact]
    public async Task TryReserveAsync_ShouldRejectASecondReservation_ForTheSameDeduplicationKey()
    {
        var first = new SentEmail(Guid.NewGuid(), UserId, EmailType.Welcome, "s", "user@example.com",
            "welcome-v1", "es-ES", EmailStatus.Pending, $"welcome:{UserId}", _clock.UtcNow());
        var second = first with { Id = Guid.NewGuid() };

        var firstReserved = await _sentEmailRepository.TryReserveAsync(first);
        var secondReserved = await _sentEmailRepository.TryReserveAsync(second);

        Assert.True(firstReserved);
        Assert.False(secondReserved);
    }

    [Fact]
    public async Task SendWelcomeEmailAsync_ShouldRetryUsingTheSameRow_AfterATransientFailure()
    {
        SeedUser(UserId, _clock.UtcNow().AddHours(-3));
        _emailSender.NextResult = Result.Failure<EmailSendResult>("Resend is down");
        var manager = CreateManager();

        await Assert.ThrowsAsync<InvalidOperationException>(() => manager.SendWelcomeEmailAsync(UserId));
        Assert.Equal(EmailStatus.Failed, Assert.Single(_sentEmailRepository.All).Status);

        _emailSender.NextResult = new EmailSendResult("retry-message-id");
        await manager.SendWelcomeEmailAsync(UserId);

        var sentEmail = Assert.Single(_sentEmailRepository.All); // still one row, not a duplicate
        Assert.Equal(EmailStatus.Sent, sentEmail.Status);
        Assert.Equal("retry-message-id", sentEmail.ProviderMessageId);
        Assert.Single(_emailLinkClickRepository.All); // tracked links not duplicated on retry
    }

    [Fact]
    public async Task SendWelcomeEmailAsync_ShouldSkip_WhenTheUserDoesNotExist()
    {
        var manager = CreateManager();

        await manager.SendWelcomeEmailAsync("missing-user");

        Assert.Empty(_emailSender.SentMessages);
    }

    [Fact]
    public async Task SendWelcomeEmailAsync_FailureForOneUser_ShouldNotAffectAnother()
    {
        SeedUser("failing-user", _clock.UtcNow().AddHours(-3));
        SeedUser("healthy-user", _clock.UtcNow().AddHours(-3), email: "healthy@example.com");
        var manager = CreateManager();

        _emailSender.NextResult = Result.Failure<EmailSendResult>("boom");
        await Assert.ThrowsAsync<InvalidOperationException>(() => manager.SendWelcomeEmailAsync("failing-user"));

        _emailSender.NextResult = new EmailSendResult("ok-message-id");
        await manager.SendWelcomeEmailAsync("healthy-user");

        var healthyEmail = _sentEmailRepository.All.Single(e => e.UserId == "healthy-user");
        Assert.Equal(EmailStatus.Sent, healthyEmail.Status);
    }

    // --- Test send ---------------------------------------------------------------------

    [Fact]
    public async Task SendTestWelcomeEmailAsync_ShouldSendToTheConfiguredAdminRecipient()
    {
        SeedUser(UserId, _clock.UtcNow(), email: "not-yet-eligible@example.com"); // registered "now" — would fail real eligibility
        var manager = CreateManager();

        var result = await manager.SendTestWelcomeEmailAsync(UserId);

        Assert.True(result.IsSuccess);
        var message = Assert.Single(_emailSender.SentMessages);
        Assert.Equal(_appConfiguration.AdminTestEmailRecipient, message.To);
        Assert.StartsWith("[TEST]", message.Subject);
    }

    [Fact]
    public async Task SendTestWelcomeEmailAsync_ShouldNotCountAsARealWelcome()
    {
        SeedUser(UserId, _clock.UtcNow().AddHours(-3));
        var manager = CreateManager();

        await manager.SendTestWelcomeEmailAsync(UserId);

        Assert.DoesNotContain(UserId, await _sentEmailRepository.GetUserIdsWithSentEmailAsync(EmailType.Welcome));
    }

    [Fact]
    public async Task SendTestWelcomeEmailAsync_ShouldFail_WhenNoAdminRecipientIsConfigured()
    {
        SeedUser(UserId, _clock.UtcNow().AddHours(-3));
        var manager = CreateManager(new StaticAppConfiguration(adminTestEmailRecipient: ""));

        var result = await manager.SendTestWelcomeEmailAsync(UserId);

        Assert.True(result.IsFailure);
        Assert.Empty(_emailSender.SentMessages);
    }

    // --- Feature toggle ------------------------------------------------------------------

    [Fact]
    public async Task SchedulePendingWelcomeEmailsAsync_ShouldNotEnqueueAnyone_WhenFeatureDisabled()
    {
        SeedUser(UserId, _clock.UtcNow().AddHours(-3));
        var manager = CreateManager(new StaticAppConfiguration(welcomeEmailsEnabled: false));

        await manager.SchedulePendingWelcomeEmailsAsync();

        Assert.Empty(_jobScheduler.EnqueuedWelcomeEmailUserIds);
    }

    [Fact]
    public async Task SendWelcomeEmailAsync_ShouldNotSend_WhenFeatureDisabled()
    {
        SeedUser(UserId, _clock.UtcNow().AddHours(-3));
        var manager = CreateManager(new StaticAppConfiguration(welcomeEmailsEnabled: false));

        await manager.SendWelcomeEmailAsync(UserId);

        Assert.Empty(_emailSender.SentMessages);
    }

    [Fact]
    public async Task SendTestWelcomeEmailAsync_ShouldStillSend_WhenFeatureDisabled()
    {
        // Test-sends are an explicit admin action, not the automatic pipeline — the kill
        // switch must not block them, or there'd be no way to preview the email while rollout
        // is off.
        SeedUser(UserId, _clock.UtcNow().AddHours(-3));
        var manager = CreateManager(new StaticAppConfiguration(welcomeEmailsEnabled: false));

        var result = await manager.SendTestWelcomeEmailAsync(UserId);

        Assert.True(result.IsSuccess);
        Assert.Single(_emailSender.SentMessages);
    }

    // --- Click tracking ----------------------------------------------------------------

    [Fact]
    public async Task SendWelcomeEmailAsync_ShouldRouteTheCtaThroughTheTrackingEndpoint()
    {
        SeedUser(UserId, _clock.UtcNow().AddHours(-3));
        var manager = CreateManager();

        await manager.SendWelcomeEmailAsync(UserId);

        Assert.Contains($"{_appConfiguration.ApiPublicUrl}/email/click/", _templateRenderer.LastModel!.PrimaryCtaUrl);
        var link = Assert.Single(_emailLinkClickRepository.All);
        Assert.Equal("primary-cta", link.LinkKey);
        Assert.Contains("/baules/nuevo", Uri.UnescapeDataString(link.DestinationUrl));
    }

    private string ResolveTrackedDestination(string trackedUrl)
    {
        var token = trackedUrl.Split('/').Last();
        return _emailLinkClickRepository.All.Single(l => l.Token == token).DestinationUrl;
    }
}
