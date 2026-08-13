using ElBaul.OutputPorts.TvMode;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra.Persistence;

public class TvPairingRepository(ElBaulDbContext dbContext) : ITvPairingRepository
{
    public Task<TvPairing?> GetByCodeAsync(string code) =>
        dbContext.TvPairings.AsNoTracking().FirstOrDefaultAsync(p => p.Code == code);

    public async Task CreateAsync(TvPairing pairing)
    {
        dbContext.TvPairings.Add(pairing);
        await dbContext.SaveChangesAsync();
    }

    public async Task UpdateAsync(TvPairing pairing)
    {
        dbContext.TvPairings.Update(pairing);
        await dbContext.SaveChangesAsync();
    }
}
