using ElBaul.Core.Contributions;
using Ne2Studio.Common;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using ElBaul.Domain;
namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api")]
public class ContributionsController(IContributionsManager contributionsManager) : ControllerBase
{
    // 200 con body nulo cuando no hay ninguna sugerencia que ofrecer (sin fotos candidatas, o el
    // tipo elegido no tiene ninguna) — nunca 404 por ausencia, mismo contrato que
    // GetUntaggedSuggestion/GetMemorySuggestion en PhotosController. El cliente pinta lo que
    // llegue y sigue como si nada si no llega nada.
    [HttpGet("baules/{baulId:guid}/contributions/suggestion")]
    [ProducesResponseType(typeof(ContributionSuggestionDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSuggestion(BaulId baulId)
    {
        var result = await contributionsManager.GetSuggestionAsync(baulId);
        return result.ToActionResult();
    }
}
