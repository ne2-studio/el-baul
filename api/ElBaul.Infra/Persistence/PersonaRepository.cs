using ElBaul.Core.Personas.OutputPorts;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

public class PersonaRepository(ElBaulDbContext dbContext) : IPersonaRepository
{
    public async Task<IEnumerable<Persona>> GetPersonasAsync(BaulId baulId) =>
        await dbContext.Personas.AsNoTracking().Where(s => s.BaulId == baulId).ToListAsync();

    public async Task<IReadOnlyDictionary<BaulId, int>> GetPersonaCountsAsync(IEnumerable<BaulId> baulIds)
    {
        var ids = baulIds.ToList();
        var counts = await dbContext.Personas.AsNoTracking()
            .Where(s => ids.Contains(s.BaulId))
            .GroupBy(s => s.BaulId)
            .Select(g => new { BaulId = g.Key, Count = g.Count() })
            .ToListAsync();

        return counts.ToDictionary(c => c.BaulId, c => c.Count);
    }

    public Task<Persona?> GetPersonaByIdAsync(PersonaId personaId) =>
        dbContext.Personas.AsNoTracking().FirstOrDefaultAsync(s => s.Id == personaId);

    public async Task<IEnumerable<Persona>> GetPersonasByIdsAsync(IEnumerable<PersonaId> personaIds) =>
        await dbContext.Personas.AsNoTracking().Where(s => personaIds.Contains(s.Id)).ToListAsync();

    public Task<Persona?> GetPersonaByUserIdAsync(BaulId baulId, UserId userId) =>
        dbContext.Personas.AsNoTracking().FirstOrDefaultAsync(s => s.BaulId == baulId && s.UserId == userId);

    public async Task<IEnumerable<Persona>> GetByUserIdAsync(UserId userId) =>
        await dbContext.Personas.AsNoTracking().Where(s => s.UserId == userId).ToListAsync();

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

    public async Task RemovePersonaAsync(BaulId baulId, PersonaId personaId)
    {
        await dbContext.Personas.Where(s => s.BaulId == baulId && s.Id == personaId).ExecuteDeleteAsync();
    }

    public async Task RemoveAllPersonasAsync(BaulId baulId)
    {
        await dbContext.Personas.Where(s => s.BaulId == baulId).ExecuteDeleteAsync();
    }
}
