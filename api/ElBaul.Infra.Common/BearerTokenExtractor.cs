using Microsoft.AspNetCore.Http;

namespace ElBaul.Infra;

/// <summary>
/// Pulls the raw bearer token off the Authorization header — shared by UserSyncMiddleware
/// (calling the userinfo endpoint to JIT-sync a new user) and HttpContextCurrentUserProvider
/// (exposing it to Application code via ICurrentUserProvider.GetAccessToken), so the same
/// two-line parse doesn't drift between the two.
/// </summary>
internal static class BearerTokenExtractor
{
    public static string? Extract(HttpRequest request)
    {
        var header = request.Headers.Authorization.ToString();
        return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) ? header["Bearer ".Length..] : null;
    }
}
