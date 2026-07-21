namespace ElBaul.Ports.Output;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(string id);
    Task<User?> GetByEmailAsync(string email);

    /// <summary>
    /// Users registered before the given cutoff — the candidate pool for the welcome-email
    /// scheduler, which filters further by welcome-history and blocked status.
    /// </summary>
    Task<IEnumerable<User>> GetUsersRegisteredBeforeAsync(DateTime cutoff);

    /// <summary>The candidate pool for the weekly-digest scheduler.</summary>
    Task<IEnumerable<User>> GetUsersWithDigestEnabledAsync();

    /// <summary>
    /// Updates just the LastAccessAt column. Called from UserSyncMiddleware on every
    /// authenticated request (throttled), so this is a targeted column write, not a
    /// full-entity load/save.
    /// </summary>
    Task UpdateLastAccessAsync(string id, DateTime at);

    /// <summary>
    /// Inserts the user if new, or updates email/name if already present.
    /// Called by the JIT sync middleware the first time a given "sub" is seen, since
    /// OIDC provides no admin API to look up users by email ahead of time.
    /// </summary>
    Task UpsertAsync(User user);
}
