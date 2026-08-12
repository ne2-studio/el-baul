using ElBaul.OutputPorts.Notifications;
using ElBaul.OutputPorts.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Net.Http.Headers;

namespace ElBaul.Api.Controllers;

/// <summary>
/// Loaded as an &lt;img&gt; by the recipient's email client, never carries auth — decodes a
/// signed open-pixel token (IEmailLinkSigner.TryDecodeOpenToken) and stamps
/// SentEmail.FirstOpenedAt the first time it fires. Always returns the pixel and a 200, token
/// valid or not: a broken image icon in an email would be worse than a silently-skipped write,
/// and this must never let a client distinguish a valid token from an invalid one.
///
/// Gmail (and some other providers) prefetch images server-side as soon as the email is
/// delivered, before any human opens it — that request carries a recognizable User-Agent
/// (GoogleImageProxy) which is filtered out below so it doesn't count as a real open. Apple
/// Mail Privacy Protection has no distinguishing signal and is a known, accepted gap: filtering
/// it would risk dropping genuine fast-opens too.
/// </summary>
[AllowAnonymous]
[ApiController]
[Route("email/open")]
[EnableRateLimiting("PublicLimiter")]
public class EmailOpenController(
    IEmailLinkSigner emailLinkSigner,
    ISentEmailRepository sentEmailRepository,
    IClock clock) : ControllerBase
{
    // 1x1 transparent GIF.
    private static readonly byte[] PixelBytes = Convert.FromBase64String(
        "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==");

    private static readonly string[] KnownProxyUserAgentFragments = ["GoogleImageProxy", "YahooMailProxy"];

    [HttpGet("{token}.gif")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Open(string token)
    {
        var sentEmailId = emailLinkSigner.TryDecodeOpenToken(token);
        if (sentEmailId is not null && !IsKnownProxyUserAgent(Request.Headers.UserAgent.ToString()))
        {
            await sentEmailRepository.RegisterOpenAsync(sentEmailId.Value, clock.UtcNow());
        }

        Response.Headers[HeaderNames.CacheControl] = "no-store";
        return File(PixelBytes, "image/gif");
    }

    private static bool IsKnownProxyUserAgent(string userAgent) =>
        KnownProxyUserAgentFragments.Any(fragment => userAgent.Contains(fragment, StringComparison.OrdinalIgnoreCase));
}
