using ElBaul.Api.Models;
using ElBaul.Ports.Input;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/baules/{baulId:guid}/albums")]
public class AlbumsController(IAlbumManager albumManager) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid baulId)
    {
        var result = await albumManager.GetByBaulIdAsync(baulId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid baulId, [FromBody] CreateAlbumRequest request)
    {
        var result = await albumManager.CreateAsync(baulId, request.Name, request.Description);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }
}
