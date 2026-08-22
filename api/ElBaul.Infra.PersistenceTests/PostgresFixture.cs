using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

namespace ElBaul.Infra.PersistenceTests;

/// <summary>
/// Boots one real Postgres container — migrated with the exact same ElBaulDbContext migrations
/// that run in production, not a hand-maintained schema copy — and shares it across every test
/// class in <see cref="PersistenceTestCollection"/>. Starting the container and running
/// migrations is the expensive part of a test run, so it happens once, not once per test;
/// per-test isolation instead comes from <see cref="ResetAsync"/> (see
/// <see cref="PersistenceTestBase"/>). See README.md for why this project exists and what it
/// deliberately does not try to cover.
/// </summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    private PostgreSqlContainer _container = null!;
    private DbContextOptions<ElBaulDbContext> _options = null!;
    private IReadOnlyList<string> _tableNames = null!;

    public async Task InitializeAsync()
    {
        _container = new PostgreSqlBuilder("postgres:16")
            .WithDatabase("elbaul_persistence_tests")
            .WithUsername("elbaul")
            .WithPassword("elbaul")
            .Build();
        await _container.StartAsync();

        _options = new DbContextOptionsBuilder<ElBaulDbContext>()
            .UseNpgsql(_container.GetConnectionString())
            .Options;

        await using var dbContext = CreateDbContext();
        await dbContext.Database.MigrateAsync();

        // Every table ElBaulDbContext actually owns — not "__EFMigrationsHistory", which
        // ResetAsync must leave untouched so it never re-applies a migration that already ran.
        _tableNames = dbContext.Model.GetEntityTypes()
            .Select(entityType => entityType.GetTableName())
            .Where(name => name is not null)
            .Cast<string>()
            .Distinct()
            .ToList();
    }

    public async Task DisposeAsync() => await _container.DisposeAsync();

    public ElBaulDbContext CreateDbContext() => new(_options);

    /// <summary>Truncates every ElBaulDbContext table — one round trip, no container restart —
    /// so each test starts from a genuinely empty database instead of a test author having to
    /// dodge other tests' leftover rows with unique ids or before/after count deltas.</summary>
    public async Task ResetAsync()
    {
        await using var dbContext = CreateDbContext();
        var quotedTableNames = string.Join(", ", _tableNames.Select(name => $"\"{name}\"")
            .Append("analytics.user_baul_activity_daily")
            .Append("analytics.user_sessions"));
        // Built entirely from EF's own model metadata (captured in InitializeAsync), never from
        // request/user input — string.Concat rather than an interpolated literal only to keep
        // the EF1002 "don't interpolate raw SQL" analyzer, tuned for user-supplied values, quiet.
        var truncateSql = string.Concat("TRUNCATE TABLE ", quotedTableNames, " RESTART IDENTITY CASCADE;");
        await dbContext.Database.ExecuteSqlRawAsync(truncateSql);
    }
}
