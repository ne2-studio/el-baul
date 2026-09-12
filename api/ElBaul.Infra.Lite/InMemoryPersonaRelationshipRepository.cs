using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

// Keyed by the (ParentId, ChildId) pair — see InMemoryPersonaRepository.cs for why every method
// here locks and materializes results before returning.
public class InMemoryPersonaRelationshipRepository : IPersonaRelationshipRepository
{
    private readonly Dictionary<(PersonaId ParentId, PersonaId ChildId), PersonaRelationship> _relationships = new();
    private readonly Lock _lock = new();

    public Task<IEnumerable<PersonaRelationship>> GetByBaulIdAsync(BaulId baulId)
    {
        lock (_lock) return Task.FromResult(_relationships.Values.Where(r => r.BaulId == baulId).ToList().AsEnumerable());
    }

    public Task<PersonaRelationship?> GetBetweenAsync(PersonaId personaIdA, PersonaId personaIdB)
    {
        lock (_lock)
        {
            return Task.FromResult(_relationships.Values.FirstOrDefault(r =>
                (r.ParentId == personaIdA && r.ChildId == personaIdB) ||
                (r.ParentId == personaIdB && r.ChildId == personaIdA)));
        }
    }

    public Task AddAsync(PersonaRelationship relationship)
    {
        lock (_lock) _relationships[(relationship.ParentId, relationship.ChildId)] = relationship;
        return Task.CompletedTask;
    }

    public Task RemoveAsync(PersonaId parentId, PersonaId childId)
    {
        lock (_lock) _relationships.Remove((parentId, childId));
        return Task.CompletedTask;
    }

    public Task DeleteByBaulIdAsync(BaulId baulId)
    {
        lock (_lock)
        {
            var keys = _relationships.Values.Where(r => r.BaulId == baulId)
                .Select(r => (r.ParentId, r.ChildId)).ToList();
            foreach (var key in keys) _relationships.Remove(key);
        }
        return Task.CompletedTask;
    }
}
