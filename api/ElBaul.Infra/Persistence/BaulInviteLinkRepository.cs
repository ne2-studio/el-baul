using ElBaul.OutputPorts.Sharing;
using ElBaul.Shared;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace ElBaul.Infra.Persistence;

public class BaulInviteLinkRepository(ElBaulDbContext dbContext) : IBaulInviteLinkRepository
{
    public Task<BaulInviteLink?> GetActiveByBaulIdAsync(BaulId baulId) =>
        dbContext.BaulInviteLinks.AsNoTracking().FirstOrDefaultAsync(l => l.BaulId == baulId && l.RevokedAt == null);

    public Task<BaulInviteLink?> GetByTokenAsync(string token) =>
        dbContext.BaulInviteLinks.AsNoTracking().FirstOrDefaultAsync(l => l.Token == token);

    public async Task CreateAsync(BaulInviteLink link)
    {
        dbContext.BaulInviteLinks.Add(link);
        try
        {
            await dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Lost a race against another concurrent GetOrCreate/Regenerate for the same
            // baúl — the partial unique index on (BaulId) WHERE RevokedAt IS NULL means an
            // active link already exists now, by whichever caller won. That satisfies this
            // method's contract just as well, so there's nothing left to do but detach (see
            // UserRepository.UpsertAsync for the identical rationale/pattern).
            dbContext.Entry(link).State = EntityState.Detached;
        }
    }

    public async Task UpdateAsync(BaulInviteLink link)
    {
        dbContext.BaulInviteLinks.Update(link);
        await dbContext.SaveChangesAsync();
    }

    public async Task DeleteByBaulIdAsync(BaulId baulId)
    {
        await dbContext.BaulInviteLinks.Where(l => l.BaulId == baulId).ExecuteDeleteAsync();
    }
}
