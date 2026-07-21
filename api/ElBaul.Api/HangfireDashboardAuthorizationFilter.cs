using System.Text;
using Hangfire.Dashboard;

namespace ElBaul.Api;

/// <summary>
/// Gates /hangfire with HTTP Basic Auth instead of the SPA's JWT bearer scheme — the
/// dashboard is opened as a plain browser navigation (e.g. from the admin backoffice's
/// "external tools" links), which never carries an Authorization header, so bearer auth
/// can't work here. Same operational-tool pattern as Metabase/Sentry/Seq, which also sit
/// outside the app's own auth session.
/// </summary>
public class HangfireDashboardAuthorizationFilter(IConfiguration configuration, IWebHostEnvironment environment)
    : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        var username = configuration["Hangfire:DashboardUsername"];
        var password = configuration["Hangfire:DashboardPassword"];

        if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
        {
            // No credentials configured — acceptable only outside Production (local/dev).
            return environment.IsDevelopment();
        }

        var header = httpContext.Request.Headers.Authorization.ToString();
        if (header.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(header["Basic ".Length..]));
                var separatorIndex = decoded.IndexOf(':');
                if (separatorIndex >= 0)
                {
                    var providedUsername = decoded[..separatorIndex];
                    var providedPassword = decoded[(separatorIndex + 1)..];
                    if (providedUsername == username && providedPassword == password)
                    {
                        return true;
                    }
                }
            }
            catch (FormatException)
            {
                // Malformed header — fall through to the 401 challenge below.
            }
        }

        httpContext.Response.Headers.WWWAuthenticate = "Basic realm=\"Hangfire\"";
        httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return false;
    }
}
