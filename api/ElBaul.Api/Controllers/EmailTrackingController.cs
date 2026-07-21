using ElBaul.Ports.Output;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ElBaul.Api.Controllers;

/// <summary>
/// Clicked from an email client, never carries auth — resolves a token to a server-generated
/// destination and redirects. The destination is never taken from the request itself (only
/// ever the DestinationUrl stored when the link was created), so this can't become an open
/// redirect.
/// </summary>
[AllowAnonymous]
[ApiController]
[Route("email/click")]
[EnableRateLimiting("PublicLimiter")]
public class EmailTrackingController(IEmailLinkClickRepository clickRepository, IClock clock) : ControllerBase
{
    [HttpGet("{token}")]
    public async Task<IActionResult> Click(string token)
    {
        var link = await clickRepository.GetByTokenAsync(token);
        if (link is null) return NotFound();

        await clickRepository.RegisterClickAsync(token, clock.UtcNow());
        return Redirect(link.DestinationUrl);
    }
}
