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

    [HttpPut("{albumId:guid}")]
    public async Task<IActionResult> Update(Guid baulId, Guid albumId, [FromBody] UpdateAlbumRequest request)
    {
        var result = await albumManager.UpdateAsync(albumId, request.Name, request.Description);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("{albumId:guid}/cover")]
    public async Task<IActionResult> SetCover(Guid baulId, Guid albumId, [FromBody] SetAlbumCoverRequest request)
    {
        if (!Guid.TryParse(request.PhotoId, out var photoId))
            return BadRequest(new { error = $"'{request.PhotoId}' is not a valid photo id." });

        var result = await albumManager.SetCoverAsync(albumId, photoId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }
}
