using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace ElBaul.Infra;

public class UserRepository(ElBaulDbContext dbContext) : IUserRepository
{
    public Task<User?> GetByIdAsync(string id) =>
        dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);

    public Task<User?> GetByEmailAsync(string email) =>
        dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email);

    public async Task<IEnumerable<User>> GetUsersRegisteredBeforeAsync(DateTime cutoff) =>
        await dbContext.Users.AsNoTracking().Where(u => u.CreatedAt <= cutoff).ToListAsync();

    public async Task<IEnumerable<User>> GetUsersWithDigestEnabledAsync() =>
        await dbContext.Users.AsNoTracking().Where(u => u.WeeklyDigestEnabled).ToListAsync();

    public Task UpdateLastAccessAsync(string id, DateTime at) =>
        dbContext.Users
            .Where(u => u.Id == id)
            .ExecuteUpdateAsync(setters => setters.SetProperty(u => u.LastAccessAt, at));

    public async Task UpsertAsync(User user)
    {
        var existing = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == user.Id);
        if (existing is null)
        {
            dbContext.Users.Add(user);
            try
            {
                await dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                // UserSyncMiddleware calls this for every request from a not-yet-synced
                // user, and a single page load routinely fires several authenticated
                // requests in parallel — for a brand-new user, more than one can land
                // here between our SELECT and INSERT. The row exists now (by whichever
                // request won), which is all this method promises, so there's nothing
                // left to do — except detach: dbContext is request-scoped, and a failed
                // insert stays tracked as Added, so anything else that calls
                // SaveChangesAsync later in the same request (e.g. BaulRepository.
                // CreateAsync, sharing this context) would otherwise try to re-insert
                // this same row and hit the identical 500 again.
                dbContext.Entry(user).State = EntityState.Detached;
            }
        }
        else
        {
            dbContext.Entry(existing).CurrentValues.SetValues(user with { CreatedAt = existing.CreatedAt });
            await dbContext.SaveChangesAsync();
        }
    }
}
