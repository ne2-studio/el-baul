using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Sharing;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

public class SharedLinkRepository(ElBaulDbContext dbContext) : ISharedLinkRepository
{
    public Task<SharedLink?> GetByTokenAsync(string token) =>
        dbContext.SharedLinks.AsNoTracking().FirstOrDefaultAsync(s => s.Token == token);

    public async Task CreateAsync(SharedLink sharedLink)
    {
        dbContext.SharedLinks.Add(sharedLink);
        await dbContext.SaveChangesAsync();
    }

    public async Task UpdateAsync(SharedLink sharedLink)
    {
        dbContext.SharedLinks.Update(sharedLink);
        await dbContext.SaveChangesAsync();
    }

    public async Task DeleteByBaulIdAsync(BaulId baulId)
    {
        await dbContext.SharedLinks.Where(s => s.BaulId == baulId).ExecuteDeleteAsync();
    }
}
