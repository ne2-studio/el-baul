using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Bauls.OutputPorts;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

public class BaulRepository(ElBaulDbContext dbContext) : IBaulRepository
{
    public Task<Baul?> GetByIdAsync(BaulId id) =>
        dbContext.Baules.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id);

    public async Task<IEnumerable<Baul>> GetOwnedByUserIdAsync(UserId userId) =>
        await dbContext.Baules.AsNoTracking().Where(b => b.CustodioId == userId).ToListAsync();

    public async Task<IEnumerable<BaulAccess>> GetSharedByUserIdAsync(UserId userId)
    {
        // The custodian's own baules are excluded here (Baul.CustodioId == userId): they're
        // already surfaced via GetOwnedByUserIdAsync, and custodians also have a real Personas
        // row, so without this filter their own baul would be listed twice. Custodio isn't a
        // Role value to filter on — see BaulRole.cs.
        var rows = await dbContext.Personas.AsNoTracking()
            .Where(s => s.UserId == userId)
            .Join(dbContext.Baules.AsNoTracking(), s => s.BaulId, b => b.Id, (s, b) => new { Baul = b, s.Role })
            .Where(x => x.Baul.CustodioId != userId)
            .ToListAsync();

        return rows.Select(r => new BaulAccess(r.Baul, r.Role));
    }

    public async Task CreateAsync(Baul baul)
    {
        dbContext.Baules.Add(baul);
        await dbContext.SaveChangesAsync();
    }

    public async Task UpdateAsync(Baul baul)
    {
        var entry = dbContext.Baules.Update(baul);
        await dbContext.SaveChangesAsync();
        // GetByIdAsync is AsNoTracking, so every caller (e.g. BaulPhotoCoverListener) that reads,
        // mutates, then updates the same Baul gets a fresh untracked instance each time. Without
        // detaching here, that instance stays attached to this request-scoped DbContext, and a
        // second UpdateAsync for the same Id later in the same request (e.g. a batch loop over
        // several photos into the same baúl) throws — EF Core refuses to track two different
        // instances with the same key. Detaching makes UpdateAsync safe to call repeatedly for
        // the same entity within one DbContext lifetime, matching how every *NoTracking read in
        // this repository already behaves.
        entry.State = EntityState.Detached;
    }

    public async Task DeleteAsync(BaulId id)
    {
        await dbContext.Baules.Where(b => b.Id == id).ExecuteDeleteAsync();
    }
}
