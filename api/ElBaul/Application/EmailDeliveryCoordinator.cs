using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application;

/// <summary>
/// Shared reserve -> render -> send -> persist orchestration for every outbound email type
/// (welcome, weekly digest, and their test variants). Not a Ports/Input use case on its own —
/// it's an internal implementation detail each *EmailManager delegates to, so the
/// reserve/idempotency logic (backed by SentEmail.DeduplicationKey's unique index) lives in
/// exactly one place instead of being copy-pasted per email type.
/// </summary>
public class EmailDeliveryCoordinator(
    ISentEmailRepository sentEmailRepository,
    IEmailLinkClickRepository emailLinkClickRepository,
    IEmailSender emailSender,
    IAppConfiguration appConfiguration,
    IClock clock,
    IIdGenerator idGenerator,
    ILogger<EmailDeliveryCoordinator> logger)
{
    public async Task<Result> SendAsync(
        string userId,
        string recipientEmail,
        string deduplicationKey,
        EmailType type,
        DateTime? activitySince,
        DateTime? activityUntil,
        Func<TrackedLinkBuilder, Task<RenderedEmail>> renderAsync)
    {
        var existing = await sentEmailRepository.GetByDeduplicationKeyAsync(deduplicationKey);
        if (existing is { Status: EmailStatus.Sent })
        {
            logger.LogInformation("EmailSkipped {Type} {UserId} already sent", type, userId);
            return Result.Success();
        }

        var linkBuilder = new TrackedLinkBuilder(appConfiguration.ApiPublicUrl);
        var rendered = await renderAsync(linkBuilder);

        if (existing is null)
        {
            var now = clock.UtcNow();
            var pending = new SentEmail(
                idGenerator.NewId(), userId, type, rendered.Subject, recipientEmail,
                rendered.TemplateVersion, rendered.Locale, EmailStatus.Pending, deduplicationKey, now,
                ActivitySince: activitySince, ActivityUntil: activityUntil);

            if (!await sentEmailRepository.TryReserveAsync(pending))
            {
                logger.LogInformation("EmailSkipped {Type} {UserId} raced by another worker", type, userId);
                return Result.Success();
            }

            existing = pending;

            // Only register tracked links the first time this SentEmail is reserved — a
            // Hangfire retry re-enters this method with `existing` already non-null (found
            // above by DeduplicationKey), so it skips straight past this block instead of
            // inserting a second, orphaned set of links.
            if (linkBuilder.PendingLinks.Count > 0)
            {
                var links = linkBuilder.PendingLinks.Select(l => l with { SentEmailId = existing.Id, CreatedAt = now });
                await emailLinkClickRepository.CreateManyAsync(links);
            }
        }

        existing = existing with { Status = EmailStatus.Sending, SendAttemptedAt = clock.UtcNow() };
        await sentEmailRepository.UpdateAsync(existing);

        var sendResult = await emailSender.SendAsync(
            new EmailMessage(recipientEmail, rendered.Subject, rendered.Html, rendered.PlainText));

        if (sendResult.IsFailure)
        {
            await sentEmailRepository.UpdateAsync(existing with { Status = EmailStatus.Failed, ErrorMessage = sendResult.Error });
            logger.LogError("EmailFailed {Type} {UserId} {SentEmailId} {Error}", type, userId, existing.Id, sendResult.Error);
            return Result.Failure(sendResult.Error);
        }

        await sentEmailRepository.UpdateAsync(existing with
        {
            Status = EmailStatus.Sent,
            Provider = "Resend",
            ProviderMessageId = sendResult.Value.ProviderMessageId,
            SentAt = clock.UtcNow()
        });
        logger.LogInformation("EmailSent {Type} {UserId} {SentEmailId}", type, userId, existing.Id);
        return Result.Success();
    }
}
