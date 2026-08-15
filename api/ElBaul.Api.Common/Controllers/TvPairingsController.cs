using ElBaul.Core.TvMode.InputPorts;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

using ElBaul.Domain;
namespace ElBaul.Api.Controllers;

// Anonymous by design for Create/GetStatus: the TV that calls them never authenticates as a
// user, same reasoning as TvSessionsController.GetContent — see docs/API-CONVENTIONS.md and
// TvPairingManager. Claim is the one authenticated step, called from the phone that scanned
// the QR.
[ApiController]
public class TvPairingsController(ITvPairingManager tvPairingManager) : ControllerBase
{
    [AllowAnonymous]
    [EnableRateLimiting("PublicLimiter")]
    [HttpPost("/api/tv-pairings")]
    [ProducesResponseType(typeof(CreateTvPairingResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Create()
    {
        var result = await tvPairingManager.CreateAsync();
        return result.ToActionResult();
    }

    [AllowAnonymous]
    [EnableRateLimiting("PublicLimiter")]
    [HttpGet("/api/tv-pairings/{code}")]
    [ProducesResponseType(typeof(TvPairingStatusDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatus(string code)
    {
        var result = await tvPairingManager.GetStatusAsync(code);
        return result.ToActionResult();
    }

    [Authorize]
    [HttpPost("/api/tv-pairings/{code}/claim")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Claim(string code, [FromBody] ClaimTvPairingRequest request)
    {
        var baulId = BaulId.Parse(request.BaulId);
        if (baulId.IsFailure) return ErrorMapping.ToActionResult(baulId.Error);

        var result = await tvPairingManager.ClaimAsync(code, baulId.Value);
        return result.ToActionResult(NoContent());
    }
}

public record ClaimTvPairingRequest(string BaulId);
