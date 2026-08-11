using ElBaul.Domain;
using ElBaul.OutputPorts.Users;
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
    // A native upsert closes that window by asking Postgres to resolve the conflict as part of
    // the same statement instead of asking C# to notice it happened. This also sidesteps a real
    // trap the previous try/catch version had: catching a UniqueViolation here does NOT mean the
    // underlying Postgres transaction is fine to keep using — a failed statement inside an
    // explicit transaction poisons the whole transaction (SQLSTATE 25P02) until it rolls back,
    // .NET-level catch or not. That's incompatible with this method ever running inside
    // IUnitOfWork.ExecuteInTransactionAsync, which is exactly why it's excluded from it (see
    // that port's doc comment) — a plain `INSERT ... ON CONFLICT` never raises that error in the
    // first place, so it doesn't have this problem regardless of whether it's ever wrapped.
    public async Task UpsertAsync(User user) =>
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
}
