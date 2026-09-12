using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Personas.OutputPorts;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

public class PersonaRelationshipRepository(ElBaulDbContext dbContext) : IPersonaRelationshipRepository
{
    public async Task<IEnumerable<PersonaRelationship>> GetByBaulIdAsync(BaulId baulId) =>
        await dbContext.PersonaRelationships.AsNoTracking()
            .Where(r => r.BaulId == baulId)
            .ToListAsync();

    public async Task<PersonaRelationship?> GetBetweenAsync(PersonaId personaIdA, PersonaId personaIdB) =>
        await dbContext.PersonaRelationships.AsNoTracking()
            .FirstOrDefaultAsync(r =>
                (r.ParentId == personaIdA && r.ChildId == personaIdB) ||
                (r.ParentId == personaIdB && r.ChildId == personaIdA));

    public async Task AddAsync(PersonaRelationship relationship)
    {
        dbContext.PersonaRelationships.Add(relationship);
        await dbContext.SaveChangesAsync();
    }

    public async Task RemoveAsync(PersonaId parentId, PersonaId childId)
    {
        await dbContext.PersonaRelationships
            .Where(r => r.ParentId == parentId && r.ChildId == childId)
            .ExecuteDeleteAsync();
    }

    public async Task DeleteByBaulIdAsync(BaulId baulId)
    {
        await dbContext.PersonaRelationships.Where(r => r.BaulId == baulId).ExecuteDeleteAsync();
    }
}
