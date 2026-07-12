namespace ElBaul.Ports.Output;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(string id);
    Task<User?> GetByEmailAsync(string email);

    /// <summary>
    /// Inserts the user if new, or refreshes email/name if already present.
    /// Called by the JIT sync middleware on every authenticated request since
    /// OIDC provides no admin API to look up users by email ahead of time.
    /// </summary>
    Task UpsertAsync(User user);
}
