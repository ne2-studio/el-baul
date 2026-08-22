using ElBaul.Core.Notifications.Domain;
using ElBaul.Domain;
namespace ElBaul.Core.Notifications.OutputPorts;
public interface ISentPushNotificationRepository
{
    /// <summary>
    /// Inserts a new SentPushNotification row. Returns false instead of throwing if another
    /// worker already reserved the same DeduplicationKey (unique index violation) — same
    /// concurrency guard as ISentEmailRepository.TryReserveAsync.
    /// </summary>
    Task<bool> TryReserveAsync(SentPushNotification pendingNotification);

    Task UpdateAsync(SentPushNotification notification);

    /// <summary>
    /// Stamps FirstOpenedAt the first time the tap-tracking token fires for this notification;
    /// a no-op if it's already set. One atomic guarded update, same shape as
    /// ISentEmailRepository.RegisterOpenAsync.
    /// </summary>
    Task RegisterOpenAsync(Guid sentPushNotificationId, DateTime openedAt);

    Task<IEnumerable<SentPushNotification>> GetRecentAsync(int limit);

    /// <summary>Every push notification ever sent/attempted for one user, most recent first — the admin's per-user history.</summary>
    Task<IEnumerable<SentPushNotification>> GetByUserIdAsync(UserId userId);
}
