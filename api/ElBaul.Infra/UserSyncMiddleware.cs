using System.Security.Claims;
using ElBaul.Ports.Output;
using Microsoft.AspNetCore.Http;

namespace ElBaul.Infra;

/// <summary>
/// Just-in-time syncs the local Users table from the validated JWT's claims on every
/// authenticated request. OIDC gives no admin API to look up users by email ahead of
/// time, so baul-sharing invitations rely on this row existing/being current instead.
/// Application/ use-case code never reads claims directly — this middleware and
/// HttpContextCurrentUserProvider are the only places that do.
/// </summary>
public class UserSyncMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, IUserRepository userRepository, IClock clock)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var sub = context.User.FindFirstValue("sub") ?? context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var email = context.User.FindFirstValue("email") ?? context.User.FindFirstValue(ClaimTypes.Email);
            var name = context.User.FindFirstValue("name") ?? context.User.FindFirstValue(ClaimTypes.Name);

            if (sub is not null && email is not null)
            {
                await userRepository.UpsertAsync(new User(sub, email, name, clock.UtcNow()));
            }
        }

        await next(context);
    }
}
