using ElBaul.Infra.Analytics;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Infra.PersistenceTests;

[Collection(PersistenceTestCollection.Name)]
public class UserActivityDailyAggregatorTests(PostgresFixture fixture) : PersistenceTestBase(fixture)
{
    [Fact]
    public async Task AggregateForDateAsync_CountsDistinctUsers_OverThe1_7And30DayWindows()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var date = new DateOnly(2026, 8, 22);

        // Same user active today and 6 days ago — counts once per window, not twice.
        await SeedSessionAsync(dbContext, "user-1", date);
        await SeedSessionAsync(dbContext, "user-1", date.AddDays(-6));
        // Active only within the 7-day window, not today.
        await SeedSessionAsync(dbContext, "user-2", date.AddDays(-3));
        // Active only within the 30-day window.
        await SeedSessionAsync(dbContext, "user-3", date.AddDays(-20));
        // Outside every window — must not be counted.
        await SeedSessionAsync(dbContext, "user-4", date.AddDays(-31));

        var aggregator = CreateAggregator(dbContext);
        await aggregator.AggregateForDateAsync(date);
        await aggregator.AggregateForDateAsync(date); // idempotent: re-running must not duplicate/double-count

        var row = await ReadRowAsync(dbContext, date);
        row.Should().Be(new ActivityRow(date, 1, 2, 3));
    }

    [Fact]
    public async Task AggregateForDateAsync_WritesZeroRow_WhenNoSessionsExistForTheWindow()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var date = new DateOnly(2026, 8, 22);

        var aggregator = CreateAggregator(dbContext);
        await aggregator.AggregateForDateAsync(date);

        var row = await ReadRowAsync(dbContext, date);
        row.Should().Be(new ActivityRow(date, 0, 0, 0));
    }

    private static UserActivityDailyAggregator CreateAggregator(ElBaulDbContext dbContext) =>
        new(dbContext, NullLogger<UserActivityDailyAggregator>.Instance);

    private static async Task SeedSessionAsync(ElBaulDbContext dbContext, string userId, DateOnly date) =>
        await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO analytics.user_sessions (id, user_id, opened_at, date, platform, entry_source)
            VALUES ({Guid.NewGuid()}, {userId}, {date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc)}, {date}, 'desktop_browser', 'direct');
            """);

    private static async Task<ActivityRow?> ReadRowAsync(ElBaulDbContext dbContext, DateOnly date) =>
        (await dbContext.Database.SqlQuery<ActivityRow>(
            $"""
            SELECT date AS "Date", active_users_1d AS "ActiveUsers1d",
                   active_users_7d AS "ActiveUsers7d", active_users_30d AS "ActiveUsers30d"
            FROM analytics.user_activity_daily
            WHERE date = {date}
            """).ToListAsync()).SingleOrDefault();

    private sealed record ActivityRow(DateOnly Date, int ActiveUsers1d, int ActiveUsers7d, int ActiveUsers30d);
}
