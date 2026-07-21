using System.Net.Mail;
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
    IEmailSender emailSender,
    IBackgroundJobScheduler backgroundJobScheduler,
    IAppConfiguration appConfiguration,
    IClock clock,
    IIdGenerator idGenerator) : IWelcomeEmailManager
{
    private static readonly TimeSpan EligibilityDelay = TimeSpan.FromHours(2);

    public async Task SchedulePendingWelcomeEmailsAsync()
    {
        var cutoff = clock.UtcNow() - EligibilityDelay;
        var candidates = await userRepository.GetUsersRegisteredBeforeAsync(cutoff);
        var alreadySent = await sentEmailRepository.GetUserIdsWithSentEmailAsync(EmailType.Welcome);
        var blocked = await sentEmailRepository.GetUserIdsWithBlockedStatusAsync();

        foreach (var user in candidates)
        {
            if (alreadySent.Contains(user.Id) || blocked.Contains(user.Id) || !IsValidEmail(user.Email))
                continue;

            backgroundJobScheduler.EnqueueWelcomeEmail(user.Id);
            logger.LogInformation("WelcomeEmailScheduled {UserId}", user.Id);
        }
    }

    public async Task SendWelcomeEmailAsync(string userId)
    {
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

        if (!IsValidEmail(user.Email))
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

        var result = await SendAsync(user, EmailType.Welcome, user.Email, $"welcome:{userId}");
        if (result.IsFailure)
        {
            // Throwing lets Hangfire's automatic retry pick this back up; the next attempt
            // re-uses the same reserved SentEmail row (see SendAsync) instead of double-sending.
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

        var deduplicationKey = $"test-welcome:{sourceUserId}:{idGenerator.NewId()}";
        return await SendAsync(user, EmailType.TestWelcome, testRecipient, deduplicationKey);
    }

    private async Task<Result> SendAsync(User user, EmailType type, string recipientEmail, string deduplicationKey)
    {
        var existing = await sentEmailRepository.GetByDeduplicationKeyAsync(deduplicationKey);
        if (existing is { Status: EmailStatus.Sent })
        {
            logger.LogInformation("WelcomeEmailSkipped {UserId} {Type} already sent", user.Id, type);
            return Result.Success();
        }

        var model = await BuildModelAsync(user);
        var rendered = templateRenderer.RenderWelcome(model);
        var subject = type == EmailType.TestWelcome ? $"[TEST] {rendered.Subject}" : rendered.Subject;

        if (existing is null)
        {
            var pending = new SentEmail(
                idGenerator.NewId(), user.Id, type, subject, recipientEmail,
                rendered.TemplateVersion, rendered.Locale, EmailStatus.Pending, deduplicationKey, clock.UtcNow());

            if (!await sentEmailRepository.TryReserveAsync(pending))
            {
                logger.LogInformation("WelcomeEmailSkipped {UserId} {Type} raced by another worker", user.Id, type);
                return Result.Success();
            }

            existing = pending;
        }

        existing = existing with { Status = EmailStatus.Sending, SendAttemptedAt = clock.UtcNow() };
        await sentEmailRepository.UpdateAsync(existing);

        var sendResult = await emailSender.SendAsync(new EmailMessage(recipientEmail, subject, rendered.Html, rendered.PlainText));

        if (sendResult.IsFailure)
        {
            await sentEmailRepository.UpdateAsync(existing with { Status = EmailStatus.Failed, ErrorMessage = sendResult.Error });
            logger.LogError("WelcomeEmailFailed {UserId} {Type} {SentEmailId} {Error}", user.Id, type, existing.Id, sendResult.Error);
            return Result.Failure(sendResult.Error);
        }

        await sentEmailRepository.UpdateAsync(existing with
        {
            Status = EmailStatus.Sent,
            Provider = "Resend",
            ProviderMessageId = sendResult.Value.ProviderMessageId,
            SentAt = clock.UtcNow()
        });
        logger.LogInformation("WelcomeEmailSent {UserId} {Type} {SentEmailId}", user.Id, type, existing.Id);
        return Result.Success();
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

    private static bool IsValidEmail(string email) =>
        !string.IsNullOrWhiteSpace(email) && MailAddress.TryCreate(email, out _);
}
