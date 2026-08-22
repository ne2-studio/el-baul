using ElBaul.Core.Notifications.Domain;
using ElBaul.Domain;
using ElBaul.Core.Notifications.OutputPorts;
namespace ElBaul.Infra.Lite;

// See InMemoryUserRepository.cs for why every method here locks and materializes query
// results before returning.
public class InMemorySentPushNotificationRepository : ISentPushNotificationRepository
{
    private readonly Dictionary<Guid, SentPushNotification> _notifications = new();
    private readonly Lock _lock = new();

    public Task<bool> TryReserveAsync(SentPushNotification pendingNotification)
    {
        lock (_lock)
        {
            if (_notifications.Values.Any(n => n.DeduplicationKey == pendingNotification.DeduplicationKey))
            {
                return Task.FromResult(false);
            }

            _notifications[pendingNotification.Id] = pendingNotification;
            return Task.FromResult(true);
        }
    }

    public Task UpdateAsync(SentPushNotification notification)
    {
        lock (_lock) _notifications[notification.Id] = notification;
        return Task.CompletedTask;
    }

    public Task RegisterOpenAsync(Guid sentPushNotificationId, DateTime openedAt)
    {
        lock (_lock)
        {
            if (_notifications.TryGetValue(sentPushNotificationId, out var notification) && notification.FirstOpenedAt is null)
            {
                _notifications[sentPushNotificationId] = notification with { FirstOpenedAt = openedAt };
            }
        }

        return Task.CompletedTask;
    }

    public Task<IEnumerable<SentPushNotification>> GetRecentAsync(int limit)
    {
        lock (_lock) return Task.FromResult(_notifications.Values.OrderByDescending(n => n.CreatedAt).Take(limit).ToList().AsEnumerable());
    }

    public Task<IEnumerable<SentPushNotification>> GetByUserIdAsync(UserId userId)
    {
        lock (_lock) return Task.FromResult(_notifications.Values.Where(n => n.UserId == userId).OrderByDescending(n => n.CreatedAt).ToList().AsEnumerable());
    }

    public IReadOnlyCollection<SentPushNotification> All
    {
        get { lock (_lock) return _notifications.Values.ToList(); }
    }
}
