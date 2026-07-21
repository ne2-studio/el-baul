namespace ElBaul.Ports.Output;

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
    string UserId,
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
    DateTime? ActivityUntil = null);
