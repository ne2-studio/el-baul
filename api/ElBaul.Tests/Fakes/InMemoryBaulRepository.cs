using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class InMemoryBaulRepository : IBaulRepository
{
    private readonly Dictionary<Guid, Baul> _baules = new();
    private readonly Dictionary<Guid, SharedUser> _sharedUsers = new();
    private readonly Dictionary<Guid, RemovalRequest> _removalRequests = new();

    public Task<Baul?> GetByIdAsync(Guid id) => Task.FromResult(_baules.GetValueOrDefault(id));

    public Task<IEnumerable<Baul>> GetOwnedByUserIdAsync(string userId) =>
        Task.FromResult(_baules.Values.Where(b => b.CustodioId == userId));

    public Task<IEnumerable<BaulAccess>> GetSharedByUserIdAsync(string userId)
    {
        var result = _sharedUsers.Values
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

    public Task<IEnumerable<SharedUser>> GetSharedUsersAsync(Guid baulId) =>
        Task.FromResult(_sharedUsers.Values.Where(s => s.BaulId == baulId));

    public Task<IReadOnlyDictionary<Guid, int>> GetSharedUserCountsAsync(IEnumerable<Guid> baulIds)
    {
        var ids = baulIds.ToHashSet();
        var counts = _sharedUsers.Values
            .Where(s => ids.Contains(s.BaulId))
            .GroupBy(s => s.BaulId)
            .ToDictionary(g => g.Key, g => g.Count());

        return Task.FromResult<IReadOnlyDictionary<Guid, int>>(counts);
    }

    public Task<SharedUser?> GetSharedUserByIdAsync(Guid sharedUserId) =>
        Task.FromResult(_sharedUsers.GetValueOrDefault(sharedUserId));

    public Task<SharedUser?> GetSharedUserByUserIdAsync(Guid baulId, string userId) =>
        Task.FromResult(_sharedUsers.Values.FirstOrDefault(s => s.BaulId == baulId && s.UserId == userId));

    public Task AddSharedUserAsync(SharedUser sharedUser)
    {
        _sharedUsers[sharedUser.Id] = sharedUser;
        return Task.CompletedTask;
    }

    public Task UpdateSharedUserAsync(SharedUser sharedUser)
    {
        _sharedUsers[sharedUser.Id] = sharedUser;
        return Task.CompletedTask;
    }

    public Task RemoveSharedUserAsync(Guid baulId, Guid sharedUserId)
    {
        var match = _sharedUsers.Values.Where(s => s.BaulId == baulId && s.Id == sharedUserId).ToList();
        foreach (var s in match) _sharedUsers.Remove(s.Id);
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
