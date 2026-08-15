using ElBaul.Core.Shared.OutputPorts;
using Microsoft.AspNetCore.Http;

namespace ElBaul.Api.Middleware;

/// <summary>
/// While IAppConfiguration.MaintenanceModeEnabled is true, short-circuits every request with
/// 503 in the shared { "error": "..." } shape — the same status ErrorMapping already uses for
/// "a downstream dependency is unavailable", since from a caller's point of view the whole
/// backend being in maintenance is just a degenerate case of that. The one exception is
/// GET /api/app-config: the frontend needs it to keep working so it can learn maintenance mode
/// is on (and learn it's back off) without a deploy, same reasoning as every other public
/// AllowAnonymous exception in API-CONVENTIONS.md.
///
/// Runs before routing/auth/rate limiting (but after CORS, so the 503 itself still carries CORS
/// headers) so none of that work happens for a request that's about to be rejected anyway.
/// </summary>
public class MaintenanceModeMiddleware(RequestDelegate next)
{
    private const string AppConfigPath = "/api/app-config";

    public async Task InvokeAsync(HttpContext context, IAppConfiguration appConfiguration)
    {
        if (appConfiguration.MaintenanceModeEnabled &&
            !context.Request.Path.StartsWithSegments(AppConfigPath, StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await context.Response.WriteAsJsonAsync(new { error = "El Baúl está en mantenimiento." });
            return;
        }

        await next(context);
    }
}
