using ElBaul.Api.Models;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
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
    [HttpGet("/api/baul-invites/{token}/claimable-personas")]
    [ProducesResponseType(typeof(IEnumerable<ClaimablePersonaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetClaimablePersonas(string token)
    {
        var result = await baulInviteLinkManager.GetClaimablePersonasAsync(token);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [Authorize]
    [HttpPost("/api/baul-invites/{token}/accept")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Accept(string token, [FromBody] AcceptBaulInviteRequest request)
    {
        PersonaId? personaId = null;
        if (!string.IsNullOrEmpty(request.PersonaId))
        {
            if (!Guid.TryParse(request.PersonaId, out var parsed))
                return BadRequest(new { error = $"'{request.PersonaId}' is not a valid persona id." });
            personaId = new PersonaId(parsed);
        }

        var result = await baulInviteLinkManager.AcceptAsync(token, personaId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }
}
