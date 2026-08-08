using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra.Persistence;

public class PushTokenRepository(ElBaulDbContext dbContext) : IPushTokenRepository
{
    public async Task UpsertAsync(PushToken token)
    {
        var existing = await dbContext.PushTokens.FirstOrDefaultAsync(t => t.Token == token.Token);
        if (existing is null)
        {
            dbContext.PushTokens.Add(token);
        }
        else
        {
            // Keep the existing row's Id — only ownership/platform/CreatedAt move.
            dbContext.Entry(existing).CurrentValues.SetValues(token with { Id = existing.Id });
        }

        await dbContext.SaveChangesAsync();
    }

    public Task DeleteAsync(string userId, string token) =>
        dbContext.PushTokens
            .Where(t => t.UserId == userId && t.Token == token)
            .ExecuteDeleteAsync();

    public async Task<IEnumerable<PushToken>> GetTokensForUserAsync(string userId) =>
        await dbContext.PushTokens.AsNoTracking().Where(t => t.UserId == userId).ToListAsync();

    public async Task<IEnumerable<string>> GetUserIdsWithTokensAsync() =>
        await dbContext.PushTokens.AsNoTracking().Select(t => t.UserId).Distinct().ToListAsync();
}
