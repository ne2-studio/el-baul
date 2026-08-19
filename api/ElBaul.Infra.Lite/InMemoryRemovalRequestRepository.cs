using ElBaul.Core.Moderation.Domain;
using ElBaul.Core.Moderation.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

// See InMemoryUserRepository.cs for why every method here locks and materializes query
// results before returning — this is a Singleton serving genuinely concurrent HTTP requests
// in el-baul-api-lite, not a single-threaded test fixture.
public class InMemoryRemovalRequestRepository : IRemovalRequestRepository
{
    private readonly Dictionary<RemovalRequestId, RemovalRequest> _removalRequests = new();
    private readonly Lock _lock = new();

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

    public Task DeleteByBaulIdAsync(BaulId baulId)
    {
        lock (_lock)
        {
            var ids = _removalRequests.Values.Where(r => r.BaulId == baulId).Select(r => r.Id).ToList();
            foreach (var id in ids) _removalRequests.Remove(id);
        }
        return Task.CompletedTask;
    }
}
