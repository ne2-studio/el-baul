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
/// Every provider that server-side-prefetches images (Gmail's GoogleImageProxy, Yahoo's
/// YahooMailProxy, Apple Mail Privacy Protection, ...) counts as an open here. None of them
/// carry a signal that reliably distinguishes a prefetch from a human opening the email, so
/// filtering only the ones with a recognizable User-Agent just skewed opens towards non-Gmail/
/// Yahoo recipients without actually fixing the underlying imprecision. Opens are best treated
/// as a directional signal, the same caveat every ESP (Mailchimp, ConvertKit, ...) ships with.
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

    [HttpGet("{token}.gif")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Open(string token)
    {
        var sentEmailId = emailLinkSigner.TryDecodeOpenToken(token);
        if (sentEmailId is not null)
        {
            await sentEmailRepository.RegisterOpenAsync(sentEmailId.Value, clock.UtcNow());
        }

        Response.Headers[HeaderNames.CacheControl] = "no-store";
        return File(PixelBytes, "image/gif");
    }
}
