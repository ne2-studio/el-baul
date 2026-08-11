using ElBaul.OutputPorts.Notifications;
using ElBaul.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ElBaul.Api.Controllers;

/// <summary>
/// Clicked from an email client, never carries auth — resolves a token to a server-generated
/// destination and redirects. New tokens are self-contained and signed (IEmailLinkSigner):
/// the destination travels inside the token itself, verified rather than looked up, so a click
/// row only ever gets created when a link is actually clicked. Tokens minted before this scheme
/// existed (plain Guid.NewGuid(), no signature) still resolve via the old DB-lookup path, so
/// already-delivered emails don't break. Either way the destination is never taken from the
/// request itself — only ever the value embedded in the verified token or stored at click time —
/// so this can't become an open redirect.
/// </summary>
[AllowAnonymous]
[ApiController]
[Route("email/click")]
[EnableRateLimiting("PublicLimiter")]
public class EmailTrackingController(
    IEmailLinkClickRepository clickRepository,
    IEmailLinkSigner emailLinkSigner,
    IClock clock) : ControllerBase
{
    [HttpGet("{token}")]
    [ProducesResponseType(StatusCodes.Status302Found)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Click(string token)
    {
        var decoded = emailLinkSigner.TryDecode(token);
        if (decoded is not null)
        {
            await clickRepository.RegisterSignedClickAsync(
                token, decoded.SentEmailId, decoded.LinkKey, decoded.DestinationUrl, clock.UtcNow());
            return Redirect(decoded.DestinationUrl);
        }

        var link = await clickRepository.GetByTokenAsync(token);
        if (link is null) return NotFound();

        await clickRepository.RegisterClickAsync(token, clock.UtcNow());
        return Redirect(link.DestinationUrl);
    }
}
