using ElBaul.Core.TvMode.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

public class InMemoryTvSessionRepository : ITvSessionRepository
{
    private readonly Dictionary<string, TvSession> _sessionsByToken = new(StringComparer.Ordinal);
    private readonly Lock _lock = new();

    public Task<TvSession?> GetByTokenAsync(string token)
    {
        lock (_lock) return Task.FromResult(_sessionsByToken.GetValueOrDefault(token));
    }

    public Task CreateAsync(TvSession session)
    {
        lock (_lock) _sessionsByToken[session.Token] = session;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(TvSession session)
    {
        lock (_lock) _sessionsByToken[session.Token] = session;
        return Task.CompletedTask;
    }

    public Task DeleteByBaulIdAsync(BaulId baulId)
    {
        lock (_lock)
        {
            var tokens = _sessionsByToken.Values.Where(s => s.BaulId == baulId).Select(s => s.Token).ToList();
            foreach (var token in tokens) _sessionsByToken.Remove(token);
        }
        return Task.CompletedTask;
    }
}
