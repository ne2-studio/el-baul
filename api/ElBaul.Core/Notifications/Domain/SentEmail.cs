using ElBaul.Domain;
namespace ElBaul.Core.Notifications.Domain;
public enum EmailType
{
    Welcome,
    TestWelcome,
    WeeklyDigest,
    TestWeeklyDigest
}

public enum EmailStatus
{
    Pending,
    Sending,
    Sent,
    Delivered,
    Failed,
    Bounced,
    Complained
}

public record SentEmail(
    Guid Id,
    UserId UserId,
    EmailType Type,
    string Subject,
    string RecipientEmail,
    string TemplateVersion,
    string Locale,
    EmailStatus Status,
    string DeduplicationKey,
    DateTime CreatedAt,
    string? Provider = null,
    string? ProviderMessageId = null,
    DateTime? SendAttemptedAt = null,
    DateTime? SentAt = null,
    string? ErrorMessage = null,
    DateTime? ActivitySince = null,
    DateTime? ActivityUntil = null,
    DateTime? FirstClickedAt = null,
    DateTime? FirstOpenedAt = null)
{
    public SentEmail MarkSending(DateTime sendAttemptedAt) =>
        this with { Status = EmailStatus.Sending, SendAttemptedAt = sendAttemptedAt };

    public SentEmail MarkFailed(string errorMessage) =>
        this with { Status = EmailStatus.Failed, ErrorMessage = errorMessage };

    public SentEmail MarkSent(string provider, string providerMessageId, DateTime sentAt) =>
        this with
        {
            Status = EmailStatus.Sent,
            Provider = provider,
            ProviderMessageId = providerMessageId,
            SentAt = sentAt,
            ErrorMessage = null
        };
}
