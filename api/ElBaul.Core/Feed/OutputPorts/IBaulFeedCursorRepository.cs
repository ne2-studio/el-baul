using ElBaul.Domain;
namespace ElBaul.Core.Feed.OutputPorts;
public interface IBaulFeedCursorRepository
{
    /// <summary>Null when the user has never opened this baúl's feed before.</summary>
    Task<DateTime?> GetAsync(UserId userId, BaulId baulId);

    /// <summary>Every baúl this user has a cursor for — fetched once per push-digest send to
    /// clamp each baúl's activity window without a query per baúl (see DigestActivityPolicy's
    /// sinceFloor parameter).</summary>
    Task<IReadOnlyDictionary<BaulId, DateTime>> GetAllForUserAsync(UserId userId);

    /// <summary>Inserts or advances the cursor to seenAt (never moves it backwards is the
    /// caller's responsibility — BaulFeedManager always passes "now").</summary>
    Task UpsertAsync(UserId userId, BaulId baulId, DateTime seenAt);
}
