using ElBaul.Application.Notifications;
using ElBaul.OutputPorts.Notifications;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Users;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Application.Notifications;
/// <summary>
/// Shared reserve -> render -> send -> persist orchestration for every outbound email type
/// (welcome, weekly digest, and their test variants). Not a Ports/Input use case on its own —
/// it's an internal implementation detail each *EmailManager delegates to, so the
/// reserve/idempotency logic (backed by SentEmail.DeduplicationKey's unique index) lives in
/// exactly one place instead of being copy-pasted per email type.
/// </summary>
public class EmailDeliveryCoordinator(
    IUserRepository userRepository,
    ISentEmailRepository sentEmailRepository,
    IEmailLinkSigner emailLinkSigner,
    IEmailSender emailSender,
    IAppConfiguration appConfiguration,
    IClock clock,
    IIdGenerator idGenerator,
    ILogger<EmailDeliveryCoordinator> logger)
{
    public async Task SendToEligibleUserAsync(
        UserId userId,
        bool isEnabled,
        ILogger callerLogger,
        string skippedEventName,
        EmailType type,
        DateTime? activitySince,
        Func<DateTime?> getActivityUntil,
        Func<User, Task<bool>> isEligibleAsync,
        Func<User, string> getDeduplicationKey,
        Func<User, TrackedLinkBuilder, Task<RenderedEmail>> renderAsync)
    {
        if (!isEnabled)
        {
            callerLogger.LogInformation("{SkippedEventName} feature disabled", skippedEventName);
            return;
        }

        var user = await userRepository.GetByIdAsync(userId);
        if (user is null)
        {
            callerLogger.LogWarning("{SkippedEventName} user not found", skippedEventName);
            return;
        }

        if (!await isEligibleAsync(user))
            return;

        if (EmailAddress.Create(user.Email).IsFailure)
        {
            callerLogger.LogWarning("{SkippedEventName} invalid email", skippedEventName);
            return;
        }

        var blocked = await sentEmailRepository.GetUserIdsWithBlockedStatusAsync();
        if (blocked.Contains(userId))
        {
            callerLogger.LogInformation("{SkippedEventName} blocked by provider", skippedEventName);
            return;
        }

        var result = await SendAsync(
            userId, user.Email, getDeduplicationKey(user), type,
            activitySince, getActivityUntil(),
            renderAsync: linkBuilder => renderAsync(user, linkBuilder));

        if (result.IsFailure)
        {
            // Throwing lets Hangfire's automatic retry pick this back up; the next attempt
            // re-uses the same reserved SentEmail row instead of double-sending.
            throw new InvalidOperationException(result.Error.Message);
        }
    }

    // Deliberately not wrapped in IUnitOfWork.ExecuteInTransactionAsync (see that port's doc
    // comment), and for two independent reasons, not just one:
    // - TryReserveAsync's INSERT (an ON CONFLICT DO NOTHING, see its own doc comment) needs to
    //   commit immediately so it acts as a cross-process lock — concurrent Hangfire workers
    //   retrying the same job race on the same unique DeduplicationKey, and only an
    //   already-committed row makes the loser back off instead of also sending. This is
    //   independent of ON CONFLICT vs. catch: it's about visibility across two different worker
    //   processes' connections, not about how the conflict itself gets resolved.
    // - emailSender.SendAsync below is a real, irreversible external effect (an email actually
    //   leaves the building). It must never sit inside a transaction that could still roll back
    //   — there is no "undo" for an email already delivered to a real inbox.
    public async Task<Result> SendAsync(
        UserId userId,
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
            logger.LogInformation("EmailSkipped {Type} already sent", type);
            return Result.Success();
        }

        // Decided before rendering (rather than left to TryReserveAsync below) because tracked
        // links get baked into the HTML during renderAsync and need the real SentEmail id
        // embedded in their signed tokens — there's no chance to rewrite them afterward. On a
        // retry, `existing` is already the row a prior attempt reserved, so its id is reused.
        var sentEmailId = existing?.Id ?? idGenerator.NewId();
        var linkBuilder = new TrackedLinkBuilder(appConfiguration.ApiPublicUrl, emailLinkSigner, sentEmailId);
        var rendered = await renderAsync(linkBuilder);

        if (existing is null)
        {
            var now = clock.UtcNow();
            var pending = new SentEmail(
                sentEmailId, userId, type, rendered.Subject, recipientEmail,
                rendered.TemplateVersion, rendered.Locale, EmailStatus.Pending, deduplicationKey, now,
                ActivitySince: activitySince, ActivityUntil: activityUntil);

            if (!await sentEmailRepository.TryReserveAsync(pending))
            {
                logger.LogInformation("EmailSkipped {Type} raced by another worker", type);
                return Result.Success();
            }

            existing = pending;
        }

        existing = existing.MarkSending(clock.UtcNow());
        await sentEmailRepository.UpdateAsync(existing);

        var sendResult = await emailSender.SendAsync(
            new EmailMessage(recipientEmail, rendered.Subject, rendered.Html, rendered.PlainText));

        if (sendResult.IsFailure)
        {
            await sentEmailRepository.UpdateAsync(existing.MarkFailed(sendResult.Error.Message));
            logger.LogError("EmailFailed {Type} {SentEmailId} {Error}", type, existing.Id, sendResult.Error);
            return Result.Failure(sendResult.Error);
        }

        await sentEmailRepository.UpdateAsync(existing.MarkSent("Resend", sendResult.Value.ProviderMessageId, clock.UtcNow()));
        logger.LogInformation("EmailSent {Type} {SentEmailId}", type, existing.Id);
        return Result.Success();
    }
}
