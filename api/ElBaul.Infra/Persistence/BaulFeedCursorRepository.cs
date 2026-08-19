using ElBaul.Core.Feed.Domain;
using ElBaul.Domain;
using ElBaul.Core.Feed.OutputPorts;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra.Persistence;

public class BaulFeedCursorRepository(ElBaulDbContext dbContext) : IBaulFeedCursorRepository
{
    public async Task<DateTime?> GetAsync(UserId userId, BaulId baulId) =>
        await dbContext.BaulFeedCursors
            .AsNoTracking()
            .Where(c => c.UserId == userId && c.BaulId == baulId)
            .Select(c => (DateTime?)c.LastSeenAt)
            .FirstOrDefaultAsync();

    public async Task<IReadOnlyDictionary<BaulId, DateTime>> GetAllForUserAsync(UserId userId) =>
        await dbContext.BaulFeedCursors
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .ToDictionaryAsync(c => c.BaulId, c => c.LastSeenAt);

    public async Task UpsertAsync(UserId userId, BaulId baulId, DateTime seenAt)
    {
        var existing = await dbContext.BaulFeedCursors
            .FirstOrDefaultAsync(c => c.UserId == userId && c.BaulId == baulId);
        if (existing is null)
        {
            dbContext.BaulFeedCursors.Add(new BaulFeedCursor(userId, baulId, seenAt));
        }
        else
        {
            dbContext.Entry(existing).CurrentValues.SetValues(existing with { LastSeenAt = seenAt });
        }

        await dbContext.SaveChangesAsync();
    }
}
