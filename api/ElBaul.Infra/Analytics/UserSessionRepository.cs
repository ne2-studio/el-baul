using ElBaul.Core.Analytics.OutputPorts;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra.Analytics;

// analytics.user_sessions has no EF entity/DbSet — same reasoning as
// UserBaulActivityDailyAggregator: it's an append-only analytics table consumed by Metabase,
// not part of the domain model EF Core needs to track.
public class UserSessionRepository(ElBaulDbContext dbContext) : IUserSessionRepository
{
    // The client already throttles calls to this once per 30 min (see app's sessionAnalytics.ts),
    // but that's a courtesy to avoid the request, not something the backend can trust: several
    // tabs/devices race it, localStorage can be cleared or unavailable (private mode), and a
    // retried request shouldn't double-count. The WHERE NOT EXISTS makes the real gate a single
    // atomic statement instead of a separate SELECT-then-INSERT that two concurrent requests
    // could both pass — a small window for a duplicate still exists between two truly
    // simultaneous requests, which is fine for an approximate DAU count.
    public async Task RecordAsync(UserSessionOpen session)
    {
        await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO analytics.user_sessions (id, user_id, opened_at, date, platform, entry_source)
            SELECT {session.Id}, {session.UserId}, {session.OpenedAtUtc}, {session.Date}, {session.Platform}, {session.EntrySource}
            WHERE NOT EXISTS (
                SELECT 1 FROM analytics.user_sessions
                WHERE user_id = {session.UserId}
                  AND opened_at > {session.OpenedAtUtc} - INTERVAL '30 minutes'
            );
            """);
    }
}
