using ElBaul.Ports.Output;

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

    public Task<IEnumerable<Baul>> GetOwnedByUserIdAsync(string userId)
    {
        lock (_lock) return Task.FromResult(_baules.Values.Where(b => b.CustodioId == userId).ToList().AsEnumerable());
    }

    public Task<IEnumerable<BaulAccess>> GetSharedByUserIdAsync(string userId)
    {
        lock (_lock)
        {
            var result = _personas.Values
                .Where(s => s.UserId == userId && s.Role != BaulRole.Custodio)
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

    public Task<Persona?> GetPersonaByUserIdAsync(BaulId baulId, string userId)
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
}
