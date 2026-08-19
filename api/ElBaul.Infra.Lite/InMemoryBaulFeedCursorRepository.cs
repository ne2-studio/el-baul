using ElBaul.Core.Feed.Domain;
using ElBaul.Domain;
using ElBaul.Core.Feed.OutputPorts;
namespace ElBaul.Infra.Lite;

// Registered as a Singleton (see ServiceRegistration.AddLiteInfrastructure) so state survives
// across requests — see InMemoryUserRepository's doc comment for why every method locks and
// materializes its results before returning.
public class InMemoryBaulFeedCursorRepository : IBaulFeedCursorRepository
{
    private readonly Dictionary<(UserId, BaulId), BaulFeedCursor> _cursors = new();
    private readonly Lock _lock = new();

    public Task<DateTime?> GetAsync(UserId userId, BaulId baulId)
    {
        lock (_lock)
            return Task.FromResult(_cursors.TryGetValue((userId, baulId), out var cursor)
                ? cursor.LastSeenAt
                : (DateTime?)null);
    }

    public Task<IReadOnlyDictionary<BaulId, DateTime>> GetAllForUserAsync(UserId userId)
    {
        lock (_lock)
        {
            var result = _cursors.Values
                .Where(c => c.UserId == userId)
                .ToDictionary(c => c.BaulId, c => c.LastSeenAt);
            return Task.FromResult<IReadOnlyDictionary<BaulId, DateTime>>(result);
        }
    }

    public Task UpsertAsync(UserId userId, BaulId baulId, DateTime seenAt)
    {
        lock (_lock)
            _cursors[(userId, baulId)] = new BaulFeedCursor(userId, baulId, seenAt);
        return Task.CompletedTask;
    }
}
