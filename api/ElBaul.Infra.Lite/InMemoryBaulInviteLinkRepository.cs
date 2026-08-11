using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Sharing;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

public class InMemoryBaulInviteLinkRepository : IBaulInviteLinkRepository
{
    private readonly Dictionary<string, BaulInviteLink> _linksByToken = new(StringComparer.Ordinal);
    private readonly Lock _lock = new();

    public Task<BaulInviteLink?> GetActiveByBaulIdAsync(BaulId baulId)
    {
        lock (_lock)
        {
            return Task.FromResult(_linksByToken.Values.FirstOrDefault(l => l.BaulId == baulId && !l.IsRevoked));
        }
    }

    public Task<BaulInviteLink?> GetByTokenAsync(string token)
    {
        lock (_lock) return Task.FromResult(_linksByToken.GetValueOrDefault(token));
    }

    public Task CreateAsync(BaulInviteLink link)
    {
        lock (_lock)
        {
            // Mirrors the real repository's race-safety contract: don't clobber an active
            // link for this baúl that another caller already created.
            if (!link.IsRevoked && _linksByToken.Values.Any(l => l.BaulId == link.BaulId && !l.IsRevoked))
                return Task.CompletedTask;

            _linksByToken[link.Token] = link;
        }
        return Task.CompletedTask;
    }

    public Task UpdateAsync(BaulInviteLink link)
    {
        lock (_lock) _linksByToken[link.Token] = link;
        return Task.CompletedTask;
    }

    public Task DeleteByBaulIdAsync(BaulId baulId)
    {
        lock (_lock)
        {
            var tokens = _linksByToken.Values.Where(l => l.BaulId == baulId).Select(l => l.Token).ToList();
            foreach (var token in tokens) _linksByToken.Remove(token);
        }
        return Task.CompletedTask;
    }
}
