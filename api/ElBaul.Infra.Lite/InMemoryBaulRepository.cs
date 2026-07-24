using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

public class InMemoryBaulRepository : IBaulRepository
{
    private readonly Dictionary<BaulId, Baul> _baules = new();
    private readonly Dictionary<PersonaId, Persona> _personas = new();
    private readonly Dictionary<RemovalRequestId, RemovalRequest> _removalRequests = new();

    public Task<Baul?> GetByIdAsync(BaulId id) => Task.FromResult(_baules.GetValueOrDefault(id));

    public Task<IEnumerable<Baul>> GetOwnedByUserIdAsync(string userId) =>
        Task.FromResult(_baules.Values.Where(b => b.CustodioId == userId));

    public Task<IEnumerable<BaulAccess>> GetSharedByUserIdAsync(string userId)
    {
        var result = _personas.Values
            .Where(s => s.UserId == userId && s.Role != BaulRole.Custodio)
            .Select(s => new BaulAccess(_baules[s.BaulId], s.Role));

        return Task.FromResult(result);
    }

    public Task CreateAsync(Baul baul)
    {
        _baules[baul.Id] = baul;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Baul baul)
    {
        _baules[baul.Id] = baul;
        return Task.CompletedTask;
    }

    public Task<IEnumerable<Persona>> GetPersonasAsync(BaulId baulId) =>
        Task.FromResult(_personas.Values.Where(s => s.BaulId == baulId));

    public Task<IReadOnlyDictionary<BaulId, int>> GetPersonaCountsAsync(IEnumerable<BaulId> baulIds)
    {
        var ids = baulIds.ToHashSet();
        var counts = _personas.Values
            .Where(s => ids.Contains(s.BaulId))
            .GroupBy(s => s.BaulId)
            .ToDictionary(g => g.Key, g => g.Count());

        return Task.FromResult<IReadOnlyDictionary<BaulId, int>>(counts);
    }

    public Task<Persona?> GetPersonaByIdAsync(PersonaId personaId) =>
        Task.FromResult(_personas.GetValueOrDefault(personaId));

    public Task<Persona?> GetPersonaByUserIdAsync(BaulId baulId, string userId) =>
        Task.FromResult(_personas.Values.FirstOrDefault(s => s.BaulId == baulId && s.UserId == userId));

    public Task AddPersonaAsync(Persona persona)
    {
        _personas[persona.Id] = persona;
        return Task.CompletedTask;
    }

    public Task UpdatePersonaAsync(Persona persona)
    {
        _personas[persona.Id] = persona;
        return Task.CompletedTask;
    }

    public Task RemovePersonaAsync(BaulId baulId, PersonaId personaId)
    {
        var match = _personas.Values.Where(s => s.BaulId == baulId && s.Id == personaId).ToList();
        foreach (var s in match) _personas.Remove(s.Id);
        return Task.CompletedTask;
    }

    public Task<IEnumerable<RemovalRequest>> GetRemovalRequestsAsync(BaulId baulId) =>
        Task.FromResult(_removalRequests.Values.Where(r => r.BaulId == baulId));

    public Task<RemovalRequest?> GetRemovalRequestAsync(BaulId baulId, RemovalRequestId requestId) =>
        Task.FromResult(_removalRequests.Values.FirstOrDefault(r => r.BaulId == baulId && r.Id == requestId));

    public Task CreateRemovalRequestAsync(RemovalRequest request)
    {
        _removalRequests[request.Id] = request;
        return Task.CompletedTask;
    }

    public Task DeleteRemovalRequestAsync(BaulId baulId, RemovalRequestId requestId)
    {
        _removalRequests.Remove(requestId);
        return Task.CompletedTask;
    }
}
