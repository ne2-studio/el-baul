using Microsoft.AspNetCore.Http;
using Serilog.Context;

namespace ElBaul.Api.Logging;

/// <summary>
/// Pushes every `{xxxId}` route value (baulId, photoId, chapterId, ...) onto Serilog's LogContext
/// under its PascalCase property name (BaulId, PhotoId, ChapterId, ...) — the same names manual
/// log calls already use — so every log line for the rest of the request, including from
/// downstream collaborators and third-party logging (EF Core, HttpClient, Hangfire), carries
/// whichever resource ids the URL itself names, without each manager threading them through its
/// own log calls by hand. Runs after UseRouting() (needs RouteValues populated) and covers the
/// same span UserLogContextMiddleware does for the *caller's* id — that one is deliberately
/// separate: AdminController's {userId} route segment names a different user (the one being
/// administered), and pushing it here under the same "UserId" property would conflate the two,
/// so it's excluded from this middleware entirely.
///
/// This only reaches the ids a route names directly. A capability whose route only carries e.g.
/// {photoId} but resolves its BaulId from the loaded entity (PhotoManager.MoveAsync) still logs
/// under PhotoId here — not a gap this middleware is meant to close; see BaulAccessService for
/// why pushing there wouldn't work either (a Task boundary, not a request-lifetime scope).
/// </summary>
public class RouteIdLogContextMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var routeIds = context.Request.RouteValues
            .Where(kv => kv.Value is not null && kv.Key.EndsWith("Id", StringComparison.Ordinal) && kv.Key != "userId")
            .ToList();

        if (routeIds.Count == 0)
        {
            await next(context);
            return;
        }

        using (PushAll(routeIds))
        {
            await next(context);
        }
    }

    private static IDisposable PushAll(List<KeyValuePair<string, object?>> routeIds)
    {
        var scopes = new IDisposable[routeIds.Count];
        for (var i = 0; i < routeIds.Count; i++)
            scopes[i] = LogContext.PushProperty(ToPropertyName(routeIds[i].Key), routeIds[i].Value);
        return new ScopeSet(scopes);
    }

    private static string ToPropertyName(string routeKey) => char.ToUpperInvariant(routeKey[0]) + routeKey[1..];

    // Disposes every pushed property, innermost (most recently pushed) first — the order
    // LogContext's own stack-based Push/Pop expects.
    private sealed class ScopeSet(IDisposable[] scopes) : IDisposable
    {
        public void Dispose()
        {
            for (var i = scopes.Length - 1; i >= 0; i--)
                scopes[i].Dispose();
        }
    }
}
