namespace ElBaul.Ports.Output;

public interface IPushTokenRepository
{
    /// <summary>
    /// Inserts the token if new, or refreshes its owner/platform/CreatedAt if already
    /// registered (matched by the Token value, not Id) — a device re-registering, e.g. after
    /// a token refresh delivered the same value again. A token is globally unique — if it was
    /// previously registered under a different user (device handed off/reinstalled under
    /// another account), ownership moves to the caller.
    /// </summary>
    Task UpsertAsync(PushToken token);

    /// <summary>No-op if the token doesn't exist or belongs to a different user.</summary>
    Task DeleteAsync(string userId, string token);

    Task<IEnumerable<PushToken>> GetTokensForUserAsync(string userId);

    /// <summary>Distinct owners of at least one registered token — the candidate pool for the
    /// daily push-digest scheduler (opting into push is just registering a device).</summary>
    Task<IEnumerable<string>> GetUserIdsWithTokensAsync();
}
