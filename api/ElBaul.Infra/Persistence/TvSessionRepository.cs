using ElBaul.Core.TvMode.OutputPorts;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

public class TvSessionRepository(ElBaulDbContext dbContext) : ITvSessionRepository
{
    public Task<TvSession?> GetByTokenAsync(string token) =>
        dbContext.TvSessions.AsNoTracking().FirstOrDefaultAsync(s => s.Token == token);

    public async Task CreateAsync(TvSession session)
    {
        dbContext.TvSessions.Add(session);
        await dbContext.SaveChangesAsync();
    }

    public async Task UpdateAsync(TvSession session)
    {
        dbContext.TvSessions.Update(session);
        await dbContext.SaveChangesAsync();
    }

    public async Task DeleteByBaulIdAsync(BaulId baulId)
    {
        await dbContext.TvSessions.Where(s => s.BaulId == baulId).ExecuteDeleteAsync();
    }
}
