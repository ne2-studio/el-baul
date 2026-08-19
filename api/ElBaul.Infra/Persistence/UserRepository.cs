using ElBaul.Core.Users.Domain;
using ElBaul.Domain;
using ElBaul.Core.Users.OutputPorts;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra.Persistence;

public class UserRepository(ElBaulDbContext dbContext) : IUserRepository
{
    public Task<User?> GetByIdAsync(UserId id) =>
        dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);

    public async Task<IEnumerable<User>> GetByIdsAsync(IEnumerable<UserId> ids) =>
        await dbContext.Users.AsNoTracking().Where(u => ids.Contains(u.Id)).ToListAsync();

    public Task<User?> GetByEmailAsync(string email) =>
        dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email);

    public async Task<IEnumerable<User>> GetUsersRegisteredBeforeAsync(DateTime cutoff) =>
        await dbContext.Users.AsNoTracking().Where(u => u.CreatedAt <= cutoff).ToListAsync();

    public async Task<IEnumerable<User>> GetUsersWithDigestEnabledAsync() =>
        await dbContext.Users.AsNoTracking().Where(u => u.WeeklyDigestEnabled).ToListAsync();

    public Task UpdateLastAccessAsync(UserId id, DateTime at) =>
        dbContext.Users
            .Where(u => u.Id == id)
            .ExecuteUpdateAsync(setters => setters.SetProperty(u => u.LastAccessAt, at));

    public Task UpdateWeeklyDigestEnabledAsync(UserId id, bool enabled) =>
        dbContext.Users
            .Where(u => u.Id == id)
            .ExecuteUpdateAsync(setters => setters.SetProperty(u => u.WeeklyDigestEnabled, enabled));

    public Task UpdateLastPushDigestSentAtAsync(UserId id, DateTime at) =>
        dbContext.Users
            .Where(u => u.Id == id)
            .ExecuteUpdateAsync(setters => setters.SetProperty(u => u.LastPushDigestSentAt, at));

    public Task MarkOnboardingSeenAsync(UserId id) =>
        dbContext.Users
            .Where(u => u.Id == id)
            .ExecuteUpdateAsync(setters => setters.SetProperty(u => u.HasSeenOnboarding, true));

    // Deliberately not migrated to stage-only + IUnitOfWork.SaveChangesAsync (unlike most other
    // repositories' Create/Update methods), and not expressed as a SELECT-then-branch against
    // the change tracker either. UserSyncMiddleware calls this for every request from a
    // not-yet-synced user, and a single page load routinely fires several authenticated requests
    // in parallel — for a brand-new user, more than one can land here concurrently. A SELECT
    // first and an `if (existing is null)` branch second is exactly the race window: two
    // requests can both see "no row" and both attempt the INSERT.
    //
    // Postgres only absorbs conflicts for the constraint named in ON CONFLICT. Concurrent
    // inserts for the same OIDC user can trip the unique Email index before the Id conflict path
    // wins. The transaction-scoped advisory lock serializes contenders for the same email, then
    // the native upsert keeps Id as the actual identity conflict target.
    public async Task UpsertAsync(User user)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync();

        await dbContext.Database.ExecuteSqlRawAsync(
            """SELECT pg_advisory_xact_lock(hashtextextended({0}, 0));""",
            user.Email);

        await dbContext.Database.ExecuteSqlRawAsync(
            // "CreatedAt" is deliberately absent from the DO UPDATE SET list below — on
            // conflict the row's original creation time survives untouched, matching the
            // previous `existing with { CreatedAt = existing.CreatedAt }` behavior.
            """
            INSERT INTO "Users" ("Id", "Email", "Name", "CreatedAt", "LastAccessAt", "WeeklyDigestEnabled", "HasSeenOnboarding", "LastPushDigestSentAt")
            VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7})
            ON CONFLICT ("Id") DO UPDATE SET
                "Email" = EXCLUDED."Email",
                "Name" = EXCLUDED."Name",
                "LastAccessAt" = EXCLUDED."LastAccessAt",
                "WeeklyDigestEnabled" = EXCLUDED."WeeklyDigestEnabled",
                "HasSeenOnboarding" = EXCLUDED."HasSeenOnboarding",
                "LastPushDigestSentAt" = EXCLUDED."LastPushDigestSentAt"
            """,
            // Null-forgiving below: Name/LastAccessAt/LastPushDigestSentAt are legitimately
            // nullable columns — Npgsql binds a null object as SQL NULL correctly, this is only
            // silencing the analyzer's blanket non-null expectation for `params object[]`.
            user.Id.Value, user.Email, user.Name!, user.CreatedAt, user.LastAccessAt!,
            user.WeeklyDigestEnabled, user.HasSeenOnboarding, user.LastPushDigestSentAt!);

        await transaction.CommitAsync();
    }
}
