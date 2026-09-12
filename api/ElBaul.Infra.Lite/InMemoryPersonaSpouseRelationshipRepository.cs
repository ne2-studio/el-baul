using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

// Keyed by the (PersonaId1, PersonaId2) pair — see InMemoryPersonaRepository.cs for why every
// method here locks and materializes results before returning.
public class InMemoryPersonaSpouseRelationshipRepository : IPersonaSpouseRelationshipRepository
{
    private readonly Dictionary<(PersonaId PersonaId1, PersonaId PersonaId2), PersonaSpouseRelationship> _relationships = new();
    private readonly Lock _lock = new();

    public Task<IEnumerable<PersonaSpouseRelationship>> GetByBaulIdAsync(BaulId baulId)
    {
        lock (_lock) return Task.FromResult(_relationships.Values.Where(r => r.BaulId == baulId).ToList().AsEnumerable());
    }

    public Task<PersonaSpouseRelationship?> GetBetweenAsync(PersonaId personaIdA, PersonaId personaIdB)
    {
        lock (_lock)
        {
            return Task.FromResult(_relationships.Values.FirstOrDefault(r =>
                (r.PersonaId1 == personaIdA && r.PersonaId2 == personaIdB) ||
                (r.PersonaId1 == personaIdB && r.PersonaId2 == personaIdA)));
        }
    }

    public Task<PersonaSpouseRelationship?> GetForPersonaAsync(PersonaId personaId)
    {
        lock (_lock)
        {
            return Task.FromResult(_relationships.Values.FirstOrDefault(r =>
                r.PersonaId1 == personaId || r.PersonaId2 == personaId));
        }
    }

    public Task AddAsync(PersonaSpouseRelationship relationship)
    {
        lock (_lock) _relationships[(relationship.PersonaId1, relationship.PersonaId2)] = relationship;
        return Task.CompletedTask;
    }

    public Task RemoveAsync(PersonaId personaId1, PersonaId personaId2)
    {
        lock (_lock) _relationships.Remove((personaId1, personaId2));
        return Task.CompletedTask;
    }

    public Task DeleteByBaulIdAsync(BaulId baulId)
    {
        lock (_lock)
        {
            var keys = _relationships.Values.Where(r => r.BaulId == baulId)
                .Select(r => (r.PersonaId1, r.PersonaId2)).ToList();
            foreach (var key in keys) _relationships.Remove(key);
        }
        return Task.CompletedTask;
    }
}
