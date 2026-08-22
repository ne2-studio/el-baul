using ElBaul.Core.Analytics.OutputPorts;
using ElBaul.Infra.Analytics;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra.PersistenceTests;

[Collection(PersistenceTestCollection.Name)]
public class UserSessionRepositoryTests(PostgresFixture fixture) : PersistenceTestBase(fixture)
{
    [Fact]
    public async Task RecordAsync_InsertsSession_IntoAnalyticsUserSessions()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var repository = new UserSessionRepository(dbContext);
        var session = new UserSessionOpen(
            Guid.NewGuid(), "user-1",
            new DateTime(2026, 8, 22, 10, 0, 0, DateTimeKind.Utc),
            new DateOnly(2026, 8, 22),
            "android_native", "push");

        await repository.RecordAsync(session);

        var rows = await ReadRowsAsync(dbContext);
        rows.Should().ContainSingle().Which.Should().Be(
            new SessionRow(session.Id, "user-1", new DateOnly(2026, 8, 22), "android_native", "push"));
    }

    [Fact]
    public async Task RecordAsync_AllowsSeveralSessions_ForSameUserAndDate()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var repository = new UserSessionRepository(dbContext);
        var date = new DateOnly(2026, 8, 22);

        await repository.RecordAsync(new UserSessionOpen(
            Guid.NewGuid(), "user-1", new DateTime(2026, 8, 22, 9, 0, 0, DateTimeKind.Utc), date, "android_native", "push"));
        await repository.RecordAsync(new UserSessionOpen(
            Guid.NewGuid(), "user-1", new DateTime(2026, 8, 22, 20, 0, 0, DateTimeKind.Utc), date, "desktop_browser", "email"));

        var rows = await ReadRowsAsync(dbContext);
        rows.Should().HaveCount(2);
    }

    [Fact]
    public async Task RecordAsync_SkipsInsert_WhenSameUserOpenedASessionLessThan30MinutesAgo()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var repository = new UserSessionRepository(dbContext);
        var date = new DateOnly(2026, 8, 22);

        await repository.RecordAsync(new UserSessionOpen(
            Guid.NewGuid(), "user-1", new DateTime(2026, 8, 22, 10, 0, 0, DateTimeKind.Utc), date, "android_native", "push"));
        await repository.RecordAsync(new UserSessionOpen(
            Guid.NewGuid(), "user-1", new DateTime(2026, 8, 22, 10, 20, 0, DateTimeKind.Utc), date, "desktop_browser", "email"));

        var rows = await ReadRowsAsync(dbContext);
        rows.Should().ContainSingle().Which.Platform.Should().Be("android_native");
    }

    [Fact]
    public async Task RecordAsync_DoesNotDeduplicate_AcrossDifferentUsers()
    {
        await using var dbContext = Fixture.CreateDbContext();
        var repository = new UserSessionRepository(dbContext);
        var openedAt = new DateTime(2026, 8, 22, 10, 0, 0, DateTimeKind.Utc);
        var date = new DateOnly(2026, 8, 22);

        await repository.RecordAsync(new UserSessionOpen(Guid.NewGuid(), "user-1", openedAt, date, "android_native", "push"));
        await repository.RecordAsync(new UserSessionOpen(Guid.NewGuid(), "user-2", openedAt, date, "android_native", "push"));

        var rows = await ReadRowsAsync(dbContext);
        rows.Should().HaveCount(2);
    }

    private static async Task<List<SessionRow>> ReadRowsAsync(ElBaulDbContext dbContext) =>
        await dbContext.Database.SqlQuery<SessionRow>(
            $"""
            SELECT id AS "Id", user_id AS "UserId", date AS "Date", platform AS "Platform", entry_source AS "EntrySource"
            FROM analytics.user_sessions
            ORDER BY opened_at
            """).ToListAsync();

    private sealed record SessionRow(Guid Id, string UserId, DateOnly Date, string Platform, string EntrySource);
}
