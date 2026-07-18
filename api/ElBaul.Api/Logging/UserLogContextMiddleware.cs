using System.Security.Claims;
using Serilog.Context;

namespace ElBaul.Api.Logging;

/// <summary>
/// Pushes the authenticated user's id onto Serilog's LogContext so every log line emitted
/// while handling the request — including from downstream middleware and Application-layer
/// business event logs — carries a {UserId} property, letting Seq correlate all of a user's
/// activity across a request without every call site having to pass it explicitly.
/// </summary>
public class UserLogContextMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var userId = context.User.Identity?.IsAuthenticated == true
            ? context.User.FindFirstValue("sub") ?? context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            : null;

        if (userId is null)
        {
            await next(context);
            return;
        }

        using (LogContext.PushProperty("UserId", userId))
        {
            await next(context);
        }
    }
}
