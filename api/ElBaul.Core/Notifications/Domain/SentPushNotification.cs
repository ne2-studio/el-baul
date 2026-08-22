using ElBaul.Domain;
namespace ElBaul.Core.Notifications.Domain;

public enum PushNotificationType
{
    WeeklySummary,
    Test
}

public enum PushNotificationStatus
{
    Pending,
    Sent,
    Failed
}

public record SentPushNotification(
    Guid Id,
    UserId UserId,
    PushNotificationType Type,
    string Title,
    string Body,
    PushNotificationStatus Status,
    string DeduplicationKey,
    DateTime CreatedAt,
    string? Provider = null,
    string? DeepLink = null,
    DateTime? SentAt = null,
    string? ErrorMessage = null,
    DateTime? FirstOpenedAt = null)
{
    public SentPushNotification MarkSent(string provider, DateTime sentAt) =>
        this with { Status = PushNotificationStatus.Sent, Provider = provider, SentAt = sentAt, ErrorMessage = null };

    public SentPushNotification MarkFailed(string errorMessage) =>
        this with { Status = PushNotificationStatus.Failed, ErrorMessage = errorMessage };
}
