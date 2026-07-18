using ElBaul.Api.Models;
using ElBaul.Ports.Input;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api")]
public class PhotosController(IPhotoManager photoManager) : ControllerBase
{
    [HttpGet("albums/{albumId:guid}/photos")]
    public async Task<IActionResult> GetByAlbum(Guid albumId)
    {
        var result = await photoManager.GetByAlbumIdAsync(albumId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("albums/{albumId:guid}/photos")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> Upload(Guid albumId, [FromForm] UploadPhotoRequest request)
    {
        if (request.File is null || request.File.Length == 0)
            return BadRequest(new { error = "No file provided" });

        if (request.ClientUploadId is null)
            return BadRequest(new { error = "ClientUploadId is required" });

        await using var stream = request.File.OpenReadStream();
        var result = await photoManager.UploadAsync(
            albumId, stream, request.File.FileName, request.File.ContentType, request.Caption, request.Date,
            request.ClientUploadId.Value);

        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("photos/{photoId:guid}/album")]
    public async Task<IActionResult> Move(Guid photoId, [FromBody] MovePhotoRequest request)
    {
        if (!Guid.TryParse(request.AlbumId, out var albumId))
            return BadRequest(new { error = $"'{request.AlbumId}' is not a valid album id." });

        var result = await photoManager.MoveAsync(photoId, albumId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("baules/{baulId:guid}/photos/sueltas")]
    public async Task<IActionResult> GetLoose(Guid baulId)
    {
        var result = await photoManager.GetLooseByBaulIdAsync(baulId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("baules/{baulId:guid}/photos/sueltas")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> UploadLoose(Guid baulId, [FromForm] UploadPhotoRequest request)
    {
        if (request.File is null || request.File.Length == 0)
            return BadRequest(new { error = "No file provided" });

        if (request.ClientUploadId is null)
            return BadRequest(new { error = "ClientUploadId is required" });

        await using var stream = request.File.OpenReadStream();
        var result = await photoManager.UploadToBaulAsync(
            baulId, stream, request.File.FileName, request.File.ContentType, request.Caption, request.Date,
            request.ClientUploadId.Value);

        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("photos/{photoId:guid}/recuerdos")]
    public async Task<IActionResult> GetRecuerdos(Guid photoId)
    {
        var result = await photoManager.GetRecuerdosAsync(photoId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("photos/{photoId:guid}/recuerdos")]
    public async Task<IActionResult> CreateRecuerdo(Guid photoId, [FromBody] CreateRecuerdoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var result = await photoManager.CreateRecuerdoAsync(photoId, request.Text);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }
}
