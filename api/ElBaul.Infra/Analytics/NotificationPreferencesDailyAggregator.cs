using ElBaul.Core.Analytics.OutputPorts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ElBaul.Infra.Analytics;

// analytics.notification_preferences_daily has no EF entity/DbSet — same reasoning as
// UserActivityDailyAggregator: it's an append-only analytics table consumed by Metabase, not
// part of the domain model EF Core needs to track. It does read from the real EF-owned "Users"
// and "PushTokens" tables, hence the quoted PascalCase identifiers below.
public class NotificationPreferencesDailyAggregator(
    ElBaulDbContext dbContext,
    ILogger<NotificationPreferencesDailyAggregator> logger) : INotificationPreferencesDailyAggregator
{
    public async Task AggregateForDateAsync(DateOnly date)
    {
        // This is a snapshot of current preference state, not a window over historical events
        // like user_activity_daily — "date" just labels which day's snapshot this row is.
        await using var transaction = await dbContext.Database.BeginTransactionAsync();

        await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"""DELETE FROM analytics.notification_preferences_daily WHERE date = {date};""");

        var inserted = await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO analytics.notification_preferences_daily (date, email_digest_enabled_users, push_eligible_users)
            SELECT
                {date},
                (SELECT COUNT(*) FROM "Users" WHERE "WeeklyDigestEnabled" = true),
                (SELECT COUNT(DISTINCT "UserId") FROM "PushTokens");
            """);

        await transaction.CommitAsync();

        logger.LogInformation(
            "Aggregated notification preferences for {Date}: {InsertedRows} row(s) inserted",
            date, inserted);
    }
}
