using ElBaul.Core.Notifications.Domain;
using ElBaul.Domain;
using ElBaul.Core.Notifications.OutputPorts;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra.Persistence;

public class SentPushNotificationRepository(ElBaulDbContext dbContext) : ISentPushNotificationRepository
{
    // Native upsert (ON CONFLICT DO NOTHING) — same rationale as SentEmailRepository.TryReserveAsync.
    public async Task<bool> TryReserveAsync(SentPushNotification pendingNotification)
    {
        var inserted = await dbContext.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "SentPushNotifications" ("Id", "UserId", "Type", "Title", "Body", "Status", "DeduplicationKey", "CreatedAt")
            VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7})
            ON CONFLICT ("DeduplicationKey") DO NOTHING
            """,
            pendingNotification.Id, pendingNotification.UserId.Value, pendingNotification.Type.ToString(),
            pendingNotification.Title, pendingNotification.Body, pendingNotification.Status.ToString(),
            pendingNotification.DeduplicationKey, pendingNotification.CreatedAt);

        return inserted == 1;
    }

    public async Task UpdateAsync(SentPushNotification notification)
    {
        dbContext.SentPushNotifications.Update(notification);
        await dbContext.SaveChangesAsync();
        dbContext.Entry(notification).State = EntityState.Detached;
    }

    public Task RegisterOpenAsync(Guid sentPushNotificationId, DateTime openedAt) =>
        dbContext.SentPushNotifications
            .Where(n => n.Id == sentPushNotificationId && n.FirstOpenedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(n => n.FirstOpenedAt, openedAt));

    public async Task<IEnumerable<SentPushNotification>> GetRecentAsync(int limit) =>
        await dbContext.SentPushNotifications.AsNoTracking()
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .ToListAsync();

    public async Task<IEnumerable<SentPushNotification>> GetByUserIdAsync(UserId userId) =>
        await dbContext.SentPushNotifications.AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();
}
