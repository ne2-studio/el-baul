using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Sharing;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

// See InMemoryUserRepository.cs for why every method here locks and materializes query
// results before returning — this is a Singleton serving genuinely concurrent HTTP requests
// in el-baul-api-lite, not a single-threaded test fixture.
public class InMemoryBaulRepository : IBaulRepository
{
    private readonly Dictionary<BaulId, Baul> _baules = new();
    private readonly Dictionary<PersonaId, Persona> _personas = new();
    private readonly Dictionary<RemovalRequestId, RemovalRequest> _removalRequests = new();
    private readonly Lock _lock = new();

    public Task<Baul?> GetByIdAsync(BaulId id)
    {
        lock (_lock) return Task.FromResult(_baules.GetValueOrDefault(id));
    }

    public Task<IEnumerable<Baul>> GetOwnedByUserIdAsync(UserId userId)
    {
        lock (_lock) return Task.FromResult(_baules.Values.Where(b => b.CustodioId == userId).ToList().AsEnumerable());
    }

    public Task<IEnumerable<BaulAccess>> GetSharedByUserIdAsync(UserId userId)
    {
        lock (_lock)
        {
            // The custodian's own baules are excluded here (Baul.CustodioId == userId): see
            // BaulRepository.GetSharedByUserIdAsync for why.
            var result = _personas.Values
                .Where(s => s.UserId == userId && s.Role != BaulRole.SinAcceso && _baules[s.BaulId].CustodioId != userId)
                .Select(s => new BaulAccess(_baules[s.BaulId], s.Role))
                .ToList();

            return Task.FromResult(result.AsEnumerable());
        }
    }

    public Task CreateAsync(Baul baul)
    {
        lock (_lock) _baules[baul.Id] = baul;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Baul baul)
    {
        lock (_lock) _baules[baul.Id] = baul;
        return Task.CompletedTask;
    }

    public Task DeleteAsync(BaulId id)
    {
        lock (_lock) _baules.Remove(id);
        return Task.CompletedTask;
    }

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

    public Task<IEnumerable<RemovalRequest>> GetRemovalRequestsAsync(BaulId baulId)
    {
        lock (_lock) return Task.FromResult(_removalRequests.Values.Where(r => r.BaulId == baulId).ToList().AsEnumerable());
    }

    public Task<RemovalRequest?> GetRemovalRequestAsync(BaulId baulId, RemovalRequestId requestId)
    {
        lock (_lock) return Task.FromResult(_removalRequests.Values.FirstOrDefault(r => r.BaulId == baulId && r.Id == requestId));
    }

    public Task CreateRemovalRequestAsync(RemovalRequest request)
    {
        lock (_lock) _removalRequests[request.Id] = request;
        return Task.CompletedTask;
    }

    public Task DeleteRemovalRequestAsync(BaulId baulId, RemovalRequestId requestId)
    {
        lock (_lock) _removalRequests.Remove(requestId);
        return Task.CompletedTask;
    }

    public Task DeleteAllRemovalRequestsAsync(BaulId baulId)
    {
        lock (_lock)
        {
            var ids = _removalRequests.Values.Where(r => r.BaulId == baulId).Select(r => r.Id).ToList();
            foreach (var id in ids) _removalRequests.Remove(id);
        }
        return Task.CompletedTask;
    }
}
