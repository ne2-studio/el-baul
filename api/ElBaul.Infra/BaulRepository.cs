using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra;

public class BaulRepository(ElBaulDbContext dbContext) : IBaulRepository
{
    public Task<Baul?> GetByIdAsync(Guid id) =>
        dbContext.Baules.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id);

    public async Task<IEnumerable<Baul>> GetOwnedByUserIdAsync(string userId) =>
        await dbContext.Baules.AsNoTracking().Where(b => b.CustodioId == userId).ToListAsync();

    public async Task<IEnumerable<BaulAccess>> GetSharedByUserIdAsync(string userId)
    {
        // Role == Custodio is excluded here: the custodian's own baules are already
        // surfaced via GetOwnedByUserIdAsync, and now that custodians also have a
        // real Personas row, without this filter their own baul would be listed twice.
        var rows = await dbContext.Personas.AsNoTracking()
            .Where(s => s.UserId == userId && s.Role != BaulRole.Custodio)
            .Join(dbContext.Baules.AsNoTracking(), s => s.BaulId, b => b.Id, (s, b) => new { Baul = b, s.Role })
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
        dbContext.Baules.Update(baul);
        await dbContext.SaveChangesAsync();
    }

    public async Task<IEnumerable<Persona>> GetPersonasAsync(Guid baulId) =>
        await dbContext.Personas.AsNoTracking().Where(s => s.BaulId == baulId).ToListAsync();

    public async Task<IReadOnlyDictionary<Guid, int>> GetPersonaCountsAsync(IEnumerable<Guid> baulIds)
    {
        var ids = baulIds.ToList();
        var counts = await dbContext.Personas.AsNoTracking()
            .Where(s => ids.Contains(s.BaulId))
            .GroupBy(s => s.BaulId)
            .Select(g => new { BaulId = g.Key, Count = g.Count() })
            .ToListAsync();

        return counts.ToDictionary(c => c.BaulId, c => c.Count);
    }

    public Task<Persona?> GetPersonaByIdAsync(Guid personaId) =>
        dbContext.Personas.AsNoTracking().FirstOrDefaultAsync(s => s.Id == personaId);

    public Task<Persona?> GetPersonaByUserIdAsync(Guid baulId, string userId) =>
        dbContext.Personas.AsNoTracking().FirstOrDefaultAsync(s => s.BaulId == baulId && s.UserId == userId);

    public async Task AddPersonaAsync(Persona persona)
    {
        dbContext.Personas.Add(persona);
        await dbContext.SaveChangesAsync();
    }

    public async Task UpdatePersonaAsync(Persona persona)
    {
        dbContext.Personas.Update(persona);
        await dbContext.SaveChangesAsync();
    }

    public async Task RemovePersonaAsync(Guid baulId, Guid personaId)
    {
        await dbContext.Personas.Where(s => s.BaulId == baulId && s.Id == personaId).ExecuteDeleteAsync();
    }

    public async Task<IEnumerable<RemovalRequest>> GetRemovalRequestsAsync(Guid baulId) =>
        await dbContext.RemovalRequests.AsNoTracking().Where(r => r.BaulId == baulId).ToListAsync();

    public Task<RemovalRequest?> GetRemovalRequestAsync(Guid baulId, Guid requestId) =>
        dbContext.RemovalRequests.AsNoTracking().FirstOrDefaultAsync(r => r.BaulId == baulId && r.Id == requestId);

    public async Task CreateRemovalRequestAsync(RemovalRequest request)
    {
        dbContext.RemovalRequests.Add(request);
        await dbContext.SaveChangesAsync();
    }

    public async Task DeleteRemovalRequestAsync(Guid baulId, Guid requestId)
    {
        await dbContext.RemovalRequests.Where(r => r.BaulId == baulId && r.Id == requestId).ExecuteDeleteAsync();
    }
}
