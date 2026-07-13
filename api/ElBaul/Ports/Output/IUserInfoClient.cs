namespace ElBaul.Ports.Output;

/// <summary>
/// Calls the OIDC provider's userinfo endpoint. Zitadel access tokens carry only "sub" —
/// email/name aren't standard OIDC access-token claims, so they must be fetched out-of-band.
/// </summary>
public interface IUserInfoClient
{
    Task<UserInfo?> GetUserInfoAsync(string accessToken);
}

public record UserInfo(string Email, string? Name);
