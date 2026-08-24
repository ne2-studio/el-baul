using ElBaul.Domain;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using ElBaul.Core.Users.Domain;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace ElBaul.Infra;

/// <summary>
/// Just-in-time syncs the local Users row for the authenticated "sub". OIDC gives no admin
/// API to look up users by email ahead of time, so baul-sharing invitations rely on this row
/// existing instead. Access tokens carry only "sub" — email/name aren't standard OIDC
/// access-token claims — so those are fetched from the userinfo endpoint once, and only when
/// the local row is missing or incomplete (new user, or one never fully synced), never on
/// every request.
/// Also touches LastAccessAt (for the backoffice's "último acceso" column) on every
/// authenticated request, throttled to once per LastAccessThrottle so it isn't a DB write
/// on every single request.
/// Application/ use-case code never reads claims directly — this middleware and
/// HttpContextCurrentUserProvider are the only places that do.
/// </summary>
public class UserSyncMiddleware(RequestDelegate next)
{
    private static readonly TimeSpan LastAccessThrottle = TimeSpan.FromMinutes(15);

    public async Task InvokeAsync(
        HttpContext context,
        IUserRepository userRepository,
        IUserInfoClient userInfoClient,
        IClock clock,
        ILogger<UserSyncMiddleware> logger)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var sub = context.User.FindFirstValue("sub") ?? context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userId = sub is not null ? new UserId(sub) : (UserId?)null;
            var existing = userId is not null ? await userRepository.GetByIdAsync(userId.Value) : null;

            if (userId is not null && (existing is null || string.IsNullOrEmpty(existing.Email)))
            {
                if (BearerTokenExtractor.Extract(context.Request) is { } accessToken)
                {
                    var userInfo = await userInfoClient.GetUserInfoAsync(accessToken);
                    if (userInfo is not null)
                    {
                        var (nombre, apellidos) = PersonNameNormalizer.Split(userInfo.Name);
                        await userRepository.UpsertAsync(new User(userId.Value, userInfo.Email, nombre, apellidos, clock.UtcNow()));
                    }
                    else
                    {
                        logger.LogWarning("Userinfo lookup failed for {Sub}; leaving user unsynced", sub);
                    }
                }
            }

            if (userId is not null)
            {
                var now = clock.UtcNow();
                if (existing?.LastAccessAt is null || now - existing.LastAccessAt.Value > LastAccessThrottle)
                {
                    await userRepository.UpdateLastAccessAsync(userId.Value, now);
                }
            }
        }

        await next(context);
    }
}
