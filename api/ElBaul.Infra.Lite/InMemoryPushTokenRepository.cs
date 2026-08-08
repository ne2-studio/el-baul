using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

// Registered as a Singleton (see ServiceRegistration.AddLiteInfrastructure) so state survives
// across requests — see InMemoryUserRepository's doc comment for why every method locks and
// materializes its results before returning.
public class InMemoryPushTokenRepository : IPushTokenRepository
{
    private readonly Dictionary<Guid, PushToken> _tokens = new();
    private readonly Lock _lock = new();

    public Task UpsertAsync(PushToken token)
    {
        lock (_lock)
        {
            var existing = _tokens.Values.FirstOrDefault(t => t.Token == token.Token);
            if (existing is not null) _tokens.Remove(existing.Id);
            _tokens[token.Id] = existing is null ? token : token with { Id = existing.Id };
        }
        return Task.CompletedTask;
    }

    public Task DeleteAsync(string userId, string token)
    {
        lock (_lock)
        {
            var existing = _tokens.Values.FirstOrDefault(t => t.UserId == userId && t.Token == token);
            if (existing is not null) _tokens.Remove(existing.Id);
        }
        return Task.CompletedTask;
    }

    public Task<IEnumerable<PushToken>> GetTokensForUserAsync(string userId)
    {
        lock (_lock) return Task.FromResult(_tokens.Values.Where(t => t.UserId == userId).ToList().AsEnumerable());
    }
}
