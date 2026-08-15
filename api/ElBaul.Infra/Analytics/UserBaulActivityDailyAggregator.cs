using ElBaul.Core.Analytics.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ElBaul.Infra.Analytics;

public class UserBaulActivityDailyAggregator(
    ElBaulDbContext dbContext,
    IAppConfiguration appConfiguration,
    ILogger<UserBaulActivityDailyAggregator> logger) : IUserBaulActivityDailyAggregator
{
    public async Task AggregateForDateAsync(DateOnly date)
    {
        var timeZoneId = appConfiguration.FunctionalTimeZoneId;
        await using var transaction = await dbContext.Database.BeginTransactionAsync();

        await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"""DELETE FROM analytics.user_baul_activity_daily WHERE date = {date};""");

        var inserted = await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"""
            WITH activity AS (
                SELECT "UploadedBy"::text AS user_id, "BaulId" AS baul_id, true AS is_contributor
                FROM "Photos"
                WHERE ("CreatedAt" AT TIME ZONE {timeZoneId})::date = {date}

                UNION ALL

                SELECT "UserId"::text AS user_id, "BaulId" AS baul_id, true AS is_contributor
                FROM "Recuerdos"
                WHERE ("CreatedAt" AT TIME ZONE {timeZoneId})::date = {date}

                UNION ALL

                SELECT "CreatedByUserId"::text AS user_id, "BaulId" AS baul_id, true AS is_contributor
                FROM "Chapters"
                WHERE "CreatedByUserId" <> ''
                  AND ("CreatedAt" AT TIME ZONE {timeZoneId})::date = {date}

                UNION ALL

                SELECT "CreatedBy"::text AS user_id, "BaulId" AS baul_id, false AS is_contributor
                FROM "SharedLinks"
                WHERE ("CreatedAt" AT TIME ZONE {timeZoneId})::date = {date}

                UNION ALL

                SELECT "UserId"::text AS user_id, "BaulId" AS baul_id, false AS is_contributor
                FROM "ChatMessages"
                WHERE "Role" = 'User'
                  AND ("CreatedAt" AT TIME ZONE {timeZoneId})::date = {date}
            ),
            rollup AS (
                SELECT user_id, baul_id, bool_or(is_contributor) AS is_contributor
                FROM activity
                GROUP BY user_id, baul_id
            )
            INSERT INTO analytics.user_baul_activity_daily (date, user_id, baul_id, is_contributor)
            SELECT {date}, user_id, baul_id, is_contributor
            FROM rollup;
            """);

        await transaction.CommitAsync();

        logger.LogInformation(
            "Aggregated user baul activity for {Date}: {InsertedRows} row(s) inserted",
            date, inserted);
    }
}
