using ElBaul.Api.Models;
using ElBaul.InputPorts.Personas;
using ElBaul.InputPorts.Sharing;
using ElBaul.OutputPorts.Shared;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

using ElBaul.Domain;
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
        return result.ToActionResult();
    }

    [Authorize]
    [HttpGet("/api/baul-invites/{token}/claimable-personas")]
    [ProducesResponseType(typeof(IEnumerable<ClaimablePersonaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetClaimablePersonas(string token)
    {
        var result = await baulInviteLinkManager.GetClaimablePersonasAsync(token);
        return result.ToActionResult();
    }

    [Authorize]
    [HttpPost("/api/baul-invites/{token}/accept")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Accept(string token, [FromBody] AcceptBaulInviteRequest request)
    {
        PersonaId? personaId = null;
        if (!string.IsNullOrEmpty(request.PersonaId))
        {
            var parsed = PersonaId.Parse(request.PersonaId);
            if (parsed.IsFailure) return ErrorMapping.ToActionResult(parsed.Error);
            personaId = parsed.Value;
        }

        var result = await baulInviteLinkManager.AcceptAsync(token, personaId);
        return result.ToActionResult();
    }
}
