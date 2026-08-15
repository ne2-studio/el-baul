using ElBaul.Domain;
namespace ElBaul.Core.Shared.OutputPorts;
public interface ICurrentUserProvider
{
    UserId GetUserId();

    /// <summary>
    /// The caller's raw bearer access token, if the current request carries one — used only
    /// for the rare out-of-band call that needs to re-hit the OIDC userinfo endpoint itself
    /// (e.g. BaulInviteLinkManager's best-effort profile-picture import), not for general
    /// identity checks (use GetUserId for that). Null outside an authenticated HTTP request.
    /// </summary>
    string? GetAccessToken();
}
