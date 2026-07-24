using CSharpFunctionalExtensions;
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

    public async Task SendWelcomeEmailAsync(string userId)
    {
        if (!appConfiguration.WelcomeEmailsEnabled)
        {
            logger.LogInformation("WelcomeEmailSkipped {UserId} feature disabled", userId);
            return;
        }

        var user = await userRepository.GetByIdAsync(userId);
        if (user is null)
        {
            logger.LogWarning("WelcomeEmailSkipped {UserId} user not found", userId);
            return;
        }

        var cutoff = clock.UtcNow() - EligibilityDelay;
        if (user.CreatedAt > cutoff)
        {
            logger.LogInformation("WelcomeEmailSkipped {UserId} not yet eligible", userId);
            return;
        }

        if (!EmailAddress.TryCreate(user.Email, out _))
        {
            logger.LogWarning("WelcomeEmailSkipped {UserId} invalid email", userId);
            return;
        }

        var blocked = await sentEmailRepository.GetUserIdsWithBlockedStatusAsync();
        if (blocked.Contains(userId))
        {
            logger.LogInformation("WelcomeEmailSkipped {UserId} blocked by provider", userId);
            return;
        }

        var result = await deliveryCoordinator.SendAsync(
            userId, user.Email, $"welcome:{userId}", EmailType.Welcome,
            activitySince: null, activityUntil: null,
            renderAsync: async linkBuilder =>
                templateRenderer.RenderWelcome(ApplyTracking(await BuildModelAsync(user), linkBuilder)));

        if (result.IsFailure)
        {
            // Throwing lets Hangfire's automatic retry pick this back up; the next attempt
            // re-uses the same reserved SentEmail row instead of double-sending.
            throw new InvalidOperationException(result.Error);
        }
    }

    public async Task<Result> SendTestWelcomeEmailAsync(string sourceUserId)
    {
        var user = await userRepository.GetByIdAsync(sourceUserId);
        if (user is null) return Result.Failure("User not found");

        var testRecipient = appConfiguration.AdminTestEmailRecipient;
        if (string.IsNullOrWhiteSpace(testRecipient))
            return Result.Failure("Resend:AdminTestRecipient is not configured");

        var deduplicationKey = $"test-welcome:{sourceUserId}:{Guid.NewGuid()}";
        return await deliveryCoordinator.SendAsync(
            sourceUserId, testRecipient, deduplicationKey, EmailType.TestWelcome,
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
        var owned = await baulRepository.GetOwnedByUserIdAsync(user.Id);
        var shared = await baulRepository.GetSharedByUserIdAsync(user.Id);
        var baules = owned.Concat(shared.Select(a => a.Baul))
            .DistinctBy(b => b.Id)
            .OrderBy(b => b.CreatedAt)
            .ToList();

        var publicUrl = appConfiguration.PublicUrl.TrimEnd('/');
        var hasBaules = baules.Count > 0;

        var targetPath = hasBaules ? $"/baules/{baules[0].Id}" : "/baules/nuevo";
        var ctaUrl = $"{publicUrl}/?redirectTo={Uri.EscapeDataString(targetPath)}";
        var ctaLabel = hasBaules ? "Añadir un recuerdo" : "Crear mi primer baúl";

        return new WelcomeEmailModel(
            user.Name ?? user.Email,
            baules.Select(b => b.Name).ToList(),
            hasBaules,
            ctaUrl,
            ctaLabel);
    }

    private static WelcomeEmailModel ApplyTracking(WelcomeEmailModel model, TrackedLinkBuilder linkBuilder) =>
        model with { PrimaryCtaUrl = linkBuilder.Track("primary-cta", model.PrimaryCtaUrl) };
}
