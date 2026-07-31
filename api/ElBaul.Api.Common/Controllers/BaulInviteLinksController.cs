using ElBaul.Ports.Input;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ElBaul.Api.Controllers;

[ApiController]
public class BaulInviteLinksController(IBaulInviteLinkManager baulInviteLinkManager) : ControllerBase
{
    [AllowAnonymous]
    [EnableRateLimiting("PublicLimiter")]
    [HttpGet("/api/baul-invites/{token}/preview")]
    [ProducesResponseType(typeof(BaulInviteLinkPreviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPreview(string token)
    {
        var result = await baulInviteLinkManager.GetPreviewAsync(token);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [Authorize]
    [HttpPost("/api/baul-invites/{token}/accept")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Accept(string token)
    {
        var result = await baulInviteLinkManager.AcceptAsync(token);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }
}
