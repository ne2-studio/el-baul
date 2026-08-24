using ElBaul.Core.Notifications.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Domain;
using ElBaul.Infra.Analytics;
using ElBaul.Infra.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Infra.PersistenceTests;

[Collection(PersistenceTestCollection.Name)]
public class NotificationPreferencesDailyAggregatorTests(PostgresFixture fixture) : PersistenceTestBase(fixture)
{
    [Fact]
    public async Task AggregateForDateAsync_CountsUsersWithDigestEnabled_AndUsersWithAtLeastOnePushToken()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var users = new UserRepository(dbContext);
        var pushTokens = new PushTokenRepository(dbContext);
        var date = new DateOnly(2026, 8, 22);

        await users.UpsertAsync(new User(new UserId("digest-on-1"), "on1@example.com", "On 1", null, DateTime.UtcNow, WeeklyDigestEnabled: true));
        await users.UpsertAsync(new User(new UserId("digest-on-2"), "on2@example.com", "On 2", null, DateTime.UtcNow, WeeklyDigestEnabled: true));
        await users.UpsertAsync(new User(new UserId("digest-off"), "off@example.com", "Off", null, DateTime.UtcNow, WeeklyDigestEnabled: false));

        // Two tokens for the same user must count once, not twice.
        await pushTokens.UpsertAsync(new PushToken(Guid.NewGuid(), new UserId("digest-on-1"), "token-a", "ios", DateTime.UtcNow));
        await pushTokens.UpsertAsync(new PushToken(Guid.NewGuid(), new UserId("digest-on-1"), "token-b", "android", DateTime.UtcNow));
        await pushTokens.UpsertAsync(new PushToken(Guid.NewGuid(), new UserId("digest-off"), "token-c", "ios", DateTime.UtcNow));

        var aggregator = CreateAggregator(dbContext);
        await aggregator.AggregateForDateAsync(date);
        await aggregator.AggregateForDateAsync(date); // idempotent: re-running must not duplicate/double-count

        var row = await ReadRowAsync(dbContext, date);
        row.Should().Be(new PreferencesRow(date, 2, 2));
    }

    [Fact]
    public async Task AggregateForDateAsync_WritesZeroRow_WhenNoUsersExist()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var date = new DateOnly(2026, 8, 22);

        var aggregator = CreateAggregator(dbContext);
        await aggregator.AggregateForDateAsync(date);

        var row = await ReadRowAsync(dbContext, date);
        row.Should().Be(new PreferencesRow(date, 0, 0));
    }

    private static NotificationPreferencesDailyAggregator CreateAggregator(ElBaulDbContext dbContext) =>
        new(dbContext, NullLogger<NotificationPreferencesDailyAggregator>.Instance);

    private static async Task<PreferencesRow?> ReadRowAsync(ElBaulDbContext dbContext, DateOnly date) =>
        (await dbContext.Database.SqlQuery<PreferencesRow>(
            $"""
            SELECT date AS "Date", email_digest_enabled_users AS "EmailDigestEnabledUsers",
                   push_eligible_users AS "PushEligibleUsers"
            FROM analytics.notification_preferences_daily
            WHERE date = {date}
            """).ToListAsync()).SingleOrDefault();

    private sealed record PreferencesRow(DateOnly Date, int EmailDigestEnabledUsers, int PushEligibleUsers);
}
