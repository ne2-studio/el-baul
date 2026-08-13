using ElBaul.Domain;
namespace ElBaul.OutputPorts.TvMode;
public interface ITvSessionRepository
{
    Task<TvSession?> GetByTokenAsync(string token);
    Task CreateAsync(TvSession session);
    Task UpdateAsync(TvSession session);

    /// <summary>Used by the admin hard-delete flow. TvSession.BaulId is a Restrict FK, so this
    /// must run before the Baul row is deleted — mirrors ISharedLinkRepository/
    /// IBaulInviteLinkRepository's same-shaped method.</summary>
    Task DeleteByBaulIdAsync(BaulId baulId);
}
