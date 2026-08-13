using ElBaul.InputPorts.TvMode;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

using ElBaul.Domain;
namespace ElBaul.Api.Controllers;

[ApiController]
public class TvSessionsController(ITvSessionManager tvSessionManager) : ControllerBase
{
    [Authorize]
    [HttpPost("/api/baules/{baulId:guid}/tv-sessions")]
    [ProducesResponseType(typeof(CreateTvSessionResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Create(BaulId baulId)
    {
        var result = await tvSessionManager.CreateAsync(baulId);
        return result.ToActionResult();
    }

    [Authorize]
    [HttpDelete("/api/tv-sessions/{token}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Cancel(string token)
    {
        var result = await tvSessionManager.CancelAsync(token);
        return result.ToActionResult(NoContent());
    }

    // Anonymous: the TV never authenticates as a user, the token itself is the credential — see
    // TvSessionManager.GetContentAsync.
    [AllowAnonymous]
    [EnableRateLimiting("PublicLimiter")]
    [HttpGet("/api/tv-sessions/{token}")]
    [ProducesResponseType(typeof(TvSessionContentDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetContent(string token)
    {
        var result = await tvSessionManager.GetContentAsync(token);
        return result.ToActionResult();
    }
}
