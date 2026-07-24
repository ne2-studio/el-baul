using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class InMemoryBaulRepository : IBaulRepository
{
    private readonly Dictionary<Guid, Baul> _baules = new();
    private readonly Dictionary<Guid, Persona> _personas = new();
    private readonly Dictionary<Guid, RemovalRequest> _removalRequests = new();

    public Task<Baul?> GetByIdAsync(Guid id) => Task.FromResult(_baules.GetValueOrDefault(id));

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

    public Task<IEnumerable<Persona>> GetPersonasAsync(Guid baulId) =>
        Task.FromResult(_personas.Values.Where(s => s.BaulId == baulId));

    public Task<IReadOnlyDictionary<Guid, int>> GetPersonaCountsAsync(IEnumerable<Guid> baulIds)
    {
        var ids = baulIds.ToHashSet();
        var counts = _personas.Values
            .Where(s => ids.Contains(s.BaulId))
            .GroupBy(s => s.BaulId)
            .ToDictionary(g => g.Key, g => g.Count());

        return Task.FromResult<IReadOnlyDictionary<Guid, int>>(counts);
    }

    public Task<Persona?> GetPersonaByIdAsync(Guid personaId) =>
        Task.FromResult(_personas.GetValueOrDefault(personaId));

    public Task<Persona?> GetPersonaByUserIdAsync(Guid baulId, string userId) =>
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

    public Task RemovePersonaAsync(Guid baulId, Guid personaId)
    {
        var match = _personas.Values.Where(s => s.BaulId == baulId && s.Id == personaId).ToList();
        foreach (var s in match) _personas.Remove(s.Id);
        return Task.CompletedTask;
    }

    public Task<IEnumerable<RemovalRequest>> GetRemovalRequestsAsync(Guid baulId) =>
        Task.FromResult(_removalRequests.Values.Where(r => r.BaulId == baulId));

    public Task<RemovalRequest?> GetRemovalRequestAsync(Guid baulId, Guid requestId) =>
        Task.FromResult(_removalRequests.Values.FirstOrDefault(r => r.BaulId == baulId && r.Id == requestId));

    public Task CreateRemovalRequestAsync(RemovalRequest request)
    {
        _removalRequests[request.Id] = request;
        return Task.CompletedTask;
    }

    public Task DeleteRemovalRequestAsync(Guid baulId, Guid requestId)
    {
        _removalRequests.Remove(requestId);
        return Task.CompletedTask;
    }
}
