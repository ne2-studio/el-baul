using ElBaul.Api.Models;
using ElBaul.Core.Recuerdos;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using ElBaul.Domain;
namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/baules/{baulId:guid}/recuerdos")]
public class RecuerdosController(IRecuerdoManager recuerdoManager) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<RecuerdoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(BaulId baulId)
    {
        var result = await recuerdoManager.GetRecuerdosAsync(baulId);
        return result.ToActionResult();
    }

    [HttpPost]
    [ProducesResponseType(typeof(RecuerdoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Create(BaulId baulId, [FromBody] CreateRecuerdoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var result = await recuerdoManager.CreateRecuerdoAsync(baulId, request.Text);
        return result.ToActionResult();
    }
}
