using ElBaul.OutputPorts.Sharing;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

public class InMemorySharedLinkRepository : ISharedLinkRepository
{
    private readonly Dictionary<string, SharedLink> _sharedLinksByToken = new(StringComparer.Ordinal);
    private readonly Lock _lock = new();

    public Task<SharedLink?> GetByTokenAsync(string token)
    {
        lock (_lock) return Task.FromResult(_sharedLinksByToken.GetValueOrDefault(token));
    }

    public Task CreateAsync(SharedLink sharedLink)
    {
        lock (_lock) _sharedLinksByToken[sharedLink.Token] = sharedLink;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(SharedLink sharedLink)
    {
        lock (_lock) _sharedLinksByToken[sharedLink.Token] = sharedLink;
        return Task.CompletedTask;
    }

    public Task DeleteByBaulIdAsync(BaulId baulId)
    {
        lock (_lock)
        {
            var tokens = _sharedLinksByToken.Values.Where(s => s.BaulId == baulId).Select(s => s.Token).ToList();
            foreach (var token in tokens) _sharedLinksByToken.Remove(token);
        }
        return Task.CompletedTask;
    }
}
