using ElBaul.Core.Analytics.OutputPorts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ElBaul.Infra.Analytics;

// analytics.user_activity_daily has no EF entity/DbSet — same reasoning as
// UserBaulActivityDailyAggregator: it's an append-only analytics table consumed by Metabase,
// not part of the domain model EF Core needs to track.
public class UserActivityDailyAggregator(
    ElBaulDbContext dbContext,
    ILogger<UserActivityDailyAggregator> logger) : IUserActivityDailyAggregator
{
    public async Task AggregateForDateAsync(DateOnly date)
    {
        // analytics.user_sessions.date is already the functional-timezone day (see
        // UserSessionManager), so the windows below just count distinct users over date ranges
        // — no AT TIME ZONE conversion needed here.
        var from7 = date.AddDays(-6);
        var from30 = date.AddDays(-29);

        await using var transaction = await dbContext.Database.BeginTransactionAsync();

        await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"""DELETE FROM analytics.user_activity_daily WHERE date = {date};""");

        var inserted = await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO analytics.user_activity_daily (date, active_users_1d, active_users_7d, active_users_30d)
            SELECT
                {date},
                COUNT(DISTINCT user_id) FILTER (WHERE date = {date}),
                COUNT(DISTINCT user_id) FILTER (WHERE date BETWEEN {from7} AND {date}),
                COUNT(DISTINCT user_id) FILTER (WHERE date BETWEEN {from30} AND {date})
            FROM analytics.user_sessions
            WHERE date BETWEEN {from30} AND {date};
            """);

        await transaction.CommitAsync();

        logger.LogInformation(
            "Aggregated user activity for {Date}: {InsertedRows} row(s) inserted",
            date, inserted);
    }
}
