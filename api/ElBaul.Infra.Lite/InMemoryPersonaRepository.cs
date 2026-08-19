using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

// See InMemoryUserRepository.cs for why every method here locks and materializes query
// results before returning — this is a Singleton serving genuinely concurrent HTTP requests
// in el-baul-api-lite, not a single-threaded test fixture.
public class InMemoryPersonaRepository : IPersonaRepository
{
    private readonly Dictionary<PersonaId, Persona> _personas = new();
    private readonly Lock _lock = new();

    public Task<IEnumerable<Persona>> GetPersonasAsync(BaulId baulId)
    {
        lock (_lock) return Task.FromResult(_personas.Values.Where(s => s.BaulId == baulId).ToList().AsEnumerable());
    }

    public Task<IReadOnlyDictionary<BaulId, int>> GetPersonaCountsAsync(IEnumerable<BaulId> baulIds)
    {
        lock (_lock)
        {
            var ids = baulIds.ToHashSet();
            var counts = _personas.Values
                .Where(s => ids.Contains(s.BaulId))
                .GroupBy(s => s.BaulId)
                .ToDictionary(g => g.Key, g => g.Count());

            return Task.FromResult<IReadOnlyDictionary<BaulId, int>>(counts);
        }
    }

    public Task<Persona?> GetPersonaByIdAsync(PersonaId personaId)
    {
        lock (_lock) return Task.FromResult(_personas.GetValueOrDefault(personaId));
    }

    public Task<IEnumerable<Persona>> GetPersonasByIdsAsync(IEnumerable<PersonaId> personaIds)
    {
        var idSet = personaIds.ToHashSet();
        lock (_lock) return Task.FromResult(_personas.Values.Where(s => idSet.Contains(s.Id)).ToList().AsEnumerable());
    }

    public Task<Persona?> GetPersonaByUserIdAsync(BaulId baulId, UserId userId)
    {
        lock (_lock) return Task.FromResult(_personas.Values.FirstOrDefault(s => s.BaulId == baulId && s.UserId == userId));
    }

    public Task<IEnumerable<Persona>> GetByUserIdAsync(UserId userId)
    {
        lock (_lock) return Task.FromResult(_personas.Values.Where(s => s.UserId == userId).ToList().AsEnumerable());
    }

    public Task AddPersonaAsync(Persona persona)
    {
        lock (_lock) _personas[persona.Id] = persona;
        return Task.CompletedTask;
    }

    public Task UpdatePersonaAsync(Persona persona)
    {
        lock (_lock) _personas[persona.Id] = persona;
        return Task.CompletedTask;
    }

    public Task RemovePersonaAsync(BaulId baulId, PersonaId personaId)
    {
        lock (_lock)
        {
            var match = _personas.Values.Where(s => s.BaulId == baulId && s.Id == personaId).ToList();
            foreach (var s in match) _personas.Remove(s.Id);
        }
        return Task.CompletedTask;
    }

    public Task RemoveAllPersonasAsync(BaulId baulId)
    {
        lock (_lock)
        {
            var ids = _personas.Values.Where(s => s.BaulId == baulId).Select(s => s.Id).ToList();
            foreach (var id in ids) _personas.Remove(id);
        }
        return Task.CompletedTask;
    }
}
