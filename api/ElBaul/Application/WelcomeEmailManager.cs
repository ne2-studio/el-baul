using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application;

public class WelcomeEmailManager(
    ILogger<WelcomeEmailManager> logger,
    IUserRepository userRepository,
    IBaulRepository baulRepository,
    ISentEmailRepository sentEmailRepository,
    IEmailTemplateRenderer templateRenderer,
    EmailDeliveryCoordinator deliveryCoordinator,
    IBackgroundJobScheduler backgroundJobScheduler,
    IAppConfiguration appConfiguration,
    ICurrentUserProvider currentUserProvider,
    IClock clock) : IWelcomeEmailManager
{
    private static readonly TimeSpan EligibilityDelay = TimeSpan.FromHours(2);

    public async Task SchedulePendingWelcomeEmailsAsync()
    {
        if (!appConfiguration.WelcomeEmailsEnabled)
        {
            logger.LogInformation("WelcomeEmailsDisabled skipping schedule");
            return;
        }

        var cutoff = clock.UtcNow() - EligibilityDelay;
        var candidates = await userRepository.GetUsersRegisteredBeforeAsync(cutoff);
        var alreadySent = await sentEmailRepository.GetUserIdsWithSentEmailAsync(EmailType.Welcome);
        var blocked = await sentEmailRepository.GetUserIdsWithBlockedStatusAsync();

        foreach (var user in candidates)
        {
            if (alreadySent.Contains(user.Id) || blocked.Contains(user.Id) || !EmailAddress.TryCreate(user.Email, out _))
                continue;

            backgroundJobScheduler.EnqueueWelcomeEmail(user.Id);
            logger.LogInformation("WelcomeEmailScheduled {UserId}", user.Id);
        }
    }

    public async Task SendWelcomeEmailAsync(UserId userId)
    {
        await deliveryCoordinator.SendToEligibleUserAsync(
            userId,
            appConfiguration.WelcomeEmailsEnabled,
            logger,
            "WelcomeEmailSkipped",
            EmailType.Welcome,
            activitySince: null,
            getActivityUntil: () => null,
            isEligibleAsync: user =>
            {
                var cutoff = clock.UtcNow() - EligibilityDelay;
                if (user.CreatedAt <= cutoff)
                    return Task.FromResult(true);

                logger.LogInformation("WelcomeEmailSkipped {UserId} not yet eligible", userId);
                return Task.FromResult(false);
            },
            getDeduplicationKey: _ => $"welcome:{userId}",
            renderAsync: async (user, linkBuilder) =>
                templateRenderer.RenderWelcome(ApplyTracking(await BuildModelAsync(user), linkBuilder)));
    }

    public async Task<Result> SendTestWelcomeEmailAsync(UserId sourceUserId)
    {
        var user = await userRepository.GetByIdAsync(sourceUserId);
        if (user is null) return Result.Failure(ApplicationError.NotFound("User not found"));

        var testRecipient = appConfiguration.AdminTestEmailRecipient;
        if (string.IsNullOrWhiteSpace(testRecipient))
            return Result.Failure(ApplicationError.Validation("Resend:AdminTestRecipient is not configured"));

        var deduplicationKey = $"test-welcome:{sourceUserId}:{Guid.NewGuid()}";
        var adminUserId = currentUserProvider.GetUserId();
        return await deliveryCoordinator.SendAsync(
            adminUserId, testRecipient, deduplicationKey, EmailType.TestWelcome,
            activitySince: null, activityUntil: null,
            renderAsync: async linkBuilder =>
            {
                var model = ApplyTracking(await BuildModelAsync(user), linkBuilder);
                var rendered = templateRenderer.RenderWelcome(model);
                return rendered with { Subject = $"[TEST] {rendered.Subject}" };
            });
    }

    private async Task<WelcomeEmailModel> BuildModelAsync(User user)
    {
        var baules = (await baulRepository.GetAccessibleByUserIdAsync(user.Id))
            .OrderBy(b => b.CreatedAt)
            .ToList();

        var publicUrl = appConfiguration.PublicUrl.TrimEnd('/');
        var hasBaules = baules.Count > 0;

        var targetPath = hasBaules ? $"/baules/{baules[0].Id}" : "/baules/nuevo";
        var ctaUrl = EmailDeliveryCoordinator.BuildRedirectUrl(publicUrl, targetPath);
        var ctaLabel = hasBaules ? "Añadir un recuerdo" : "Crear mi primer baúl";
        var notificationSettingsUrl = EmailDeliveryCoordinator.BuildRedirectUrl(publicUrl, "/configuracion/notificaciones");

        return new WelcomeEmailModel(
            user.Name ?? user.Email,
            baules.Select(b => b.Name).ToList(),
            hasBaules,
            ctaUrl,
            ctaLabel,
            notificationSettingsUrl,
            EmailFooterLinksFactory.Build(publicUrl, appConfiguration, clock));
    }

    private static WelcomeEmailModel ApplyTracking(WelcomeEmailModel model, TrackedLinkBuilder linkBuilder) =>
        model with
        {
            PrimaryCtaUrl = linkBuilder.Track("primary-cta", model.PrimaryCtaUrl),
            NotificationSettingsUrl = linkBuilder.Track("notification-settings", model.NotificationSettingsUrl),
            Footer = EmailFooterLinksFactory.Track(model.Footer, linkBuilder)
        };
}
