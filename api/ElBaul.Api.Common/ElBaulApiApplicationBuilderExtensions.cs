using ElBaul.Api.Logging;
using ElBaul.Api.Middleware;
using ElBaul.Api.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Net.Http.Headers;

namespace ElBaul.Api;

public static class ElBaulApiApplicationBuilderExtensions
{
    /// <summary>
    /// The pipeline half of <see cref="ElBaulApiServiceCollectionExtensions.AddElBaulApi"/>:
    /// static files, routing, CORS, maintenance mode, rate limiting, authentication, the
    /// per-request log context, user sync, authorization, the controllers and /health. The host
    /// owns what comes before it (exception handling, Swagger, request logging) and after it
    /// (its own routes).
    /// </summary>
    public static WebApplication UseElBaulApi(this WebApplication app)
    {
        // Serves wwwroot/email/assets/* (welcome-email images) — real static files, not bytes
        // handed out by hand from a controller. AllowAnonymous by nature: recipients' email
        // clients load these with no auth, same as EmailAssetsController's logo. Content is
        // static and versionless (filename changes if the image ever does), so caching it
        // aggressively is safe — mirrors EmailAssetsController's Cache-Control for the logo.
        app.UseStaticFiles(new StaticFileOptions
        {
            OnPrepareResponse = ctx =>
                ctx.Context.Response.Headers[HeaderNames.CacheControl] = "public, max-age=31536000, immutable"
        });

        app.UseRouting();

        app.UseCors(policy => policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader()
            // Content-Disposition isn't in the browser's default CORS-safelisted response
            // headers, so without this the photo download endpoint's filename is invisible to
            // fetch() and silently falls back to a generic name.
            .WithExposedHeaders("Content-Disposition"));

        app.UseMiddleware<MaintenanceModeMiddleware>();
        app.UseRateLimiter();
        app.UseAuthentication();
        app.UseMiddleware<UserLogContextMiddleware>();
        app.UseMiddleware<RouteIdLogContextMiddleware>();
        app.UseMiddleware<UserSyncMiddleware>();
        app.UseAuthorization();

        app.MapControllers();

        // Public, unauthenticated endpoint — rate-limited per the architecture convention.
        app.MapGet("/health", () => Results.Ok(new { status = "healthy" }))
            .RequireRateLimiting("PublicLimiter")
            .Produces<HealthResponse>(StatusCodes.Status200OK);

        return app;
    }
}
