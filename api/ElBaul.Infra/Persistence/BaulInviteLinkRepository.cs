using ElBaul.OutputPorts.Sharing;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

public class BaulInviteLinkRepository(ElBaulDbContext dbContext) : IBaulInviteLinkRepository
{
    public Task<BaulInviteLink?> GetActiveByBaulIdAsync(BaulId baulId) =>
        dbContext.BaulInviteLinks.AsNoTracking().FirstOrDefaultAsync(l => l.BaulId == baulId && l.RevokedAt == null);

    public Task<BaulInviteLink?> GetByTokenAsync(string token) =>
        dbContext.BaulInviteLinks.AsNoTracking().FirstOrDefaultAsync(l => l.Token == token);

    // ON CONFLICT targets the partial unique index by its exact predicate (BaulInviteLinkConfiguration),
    // so it only absorbs a lost race on that index — a Token collision (a second, independent
    // unique index) still isn't matched by this conflict target and raises normally, exactly as
    // a caller inserting a bad row should expect. A try/catch on any UniqueViolation, as this
    // used to be, couldn't tell those two apart and silently swallowed both.
    //
    // Callers that need the actual active link afterwards re-read with GetActiveByBaulIdAsync
    // (see IBaulInviteLinkRepository.CreateAsync) rather than assume this insert won.
    public async Task CreateAsync(BaulInviteLink link) =>
        await dbContext.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "BaulInviteLinks" ("Id", "Token", "BaulId", "CreatedBy", "CreatedAt", "RevokedAt")
            VALUES ({0}, {1}, {2}, {3}, {4}, {5})
            ON CONFLICT ("BaulId") WHERE "RevokedAt" IS NULL DO NOTHING
            """,
            // Null-forgiving: RevokedAt is always null on a freshly created link (see the
            // BaulInviteLink record's constructor), Npgsql binds it as SQL NULL correctly — this
            // only silences the analyzer's blanket non-null expectation for `params object[]`.
            link.Id.Value, link.Token, link.BaulId.Value, link.CreatedBy.Value, link.CreatedAt, link.RevokedAt!);

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
