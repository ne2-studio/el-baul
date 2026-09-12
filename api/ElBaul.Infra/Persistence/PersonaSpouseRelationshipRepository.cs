using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Personas.OutputPorts;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

public class PersonaSpouseRelationshipRepository(ElBaulDbContext dbContext) : IPersonaSpouseRelationshipRepository
{
    public async Task<IEnumerable<PersonaSpouseRelationship>> GetByBaulIdAsync(BaulId baulId) =>
        await dbContext.PersonaSpouseRelationships.AsNoTracking()
            .Where(r => r.BaulId == baulId)
            .ToListAsync();

    public async Task<PersonaSpouseRelationship?> GetBetweenAsync(PersonaId personaIdA, PersonaId personaIdB) =>
        await dbContext.PersonaSpouseRelationships.AsNoTracking()
            .FirstOrDefaultAsync(r =>
                (r.PersonaId1 == personaIdA && r.PersonaId2 == personaIdB) ||
                (r.PersonaId1 == personaIdB && r.PersonaId2 == personaIdA));

    public async Task<PersonaSpouseRelationship?> GetForPersonaAsync(PersonaId personaId) =>
        await dbContext.PersonaSpouseRelationships.AsNoTracking()
            .FirstOrDefaultAsync(r => r.PersonaId1 == personaId || r.PersonaId2 == personaId);

    public async Task AddAsync(PersonaSpouseRelationship relationship)
    {
        dbContext.PersonaSpouseRelationships.Add(relationship);
        await dbContext.SaveChangesAsync();
    }

    public async Task RemoveAsync(PersonaId personaId1, PersonaId personaId2)
    {
        await dbContext.PersonaSpouseRelationships
            .Where(r => r.PersonaId1 == personaId1 && r.PersonaId2 == personaId2)
            .ExecuteDeleteAsync();
    }

    public async Task DeleteByBaulIdAsync(BaulId baulId)
    {
        await dbContext.PersonaSpouseRelationships.Where(r => r.BaulId == baulId).ExecuteDeleteAsync();
    }
}
