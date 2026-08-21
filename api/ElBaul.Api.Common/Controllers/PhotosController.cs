using ElBaul.Api.Models;
using ElBaul.Core.Personas;
using ElBaul.Core.Photos;
using ElBaul.Core.Recuerdos;
using Ne2Studio.Common;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using ElBaul.Domain;
namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api")]
public class PhotosController(
    IPhotoManager photoManager, IPhotoReadManager photoReadManager, IRecuerdoManager recuerdoManager, IPhotoPersonaTagManager photoPersonaTagManager)
    : ControllerBase
{
    [HttpGet("chapters/{chapterId:guid}/photos")]
    [ProducesResponseType(typeof(IEnumerable<PhotoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByChapter(ChapterId chapterId)
    {
        var result = await photoReadManager.GetByChapterIdAsync(chapterId);
        return result.ToActionResult();
    }

    [HttpPost("chapters/{chapterId:guid}/photos")]
    // Kept in sync manually with ImagePolicy.DefaultMaxUploadBytes (ElBaul/Application/Photos/ImagePolicy.cs)
    // — controllers can't reference Application types (see docs/architecture/backend.md), and this
    // attribute needs a compile-time constant, so it can't reference that type either.
    [RequestSizeLimit(25_000_000)]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Upload(ChapterId chapterId, [FromForm] UploadPhotoRequest request)
    {
        if (request.File is null || request.File.Length == 0)
            return BadRequest(new { error = "No file provided" });

        if (request.ClientUploadId is not { } clientUploadId)
            return BadRequest(new { error = "ClientUploadId is required" });

        await using var stream = request.File.OpenReadStream();
        var result = await photoManager.UploadAsync(chapterId, stream, clientUploadId, request.UploadBatchId);

        return result.ToActionResult();
    }

    [HttpPut("photos/{photoId:guid}/chapter")]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Move(PhotoId photoId, [FromBody] MovePhotoRequest request)
    {
        var result = await photoManager.MoveAsync(photoId, request.ChapterId);
        return result.ToActionResult();
    }

    [HttpDelete("photos/{photoId:guid}")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Delete(PhotoId photoId, [FromBody] DeletePhotoRequest request)
    {
        var result = await photoManager.DeleteAsync(photoId, request.Reason);
        return result.ToActionResult(Ok(new { success = true }));
    }

    [HttpPut("photos/{photoId:guid}/date")]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ChangeDate(PhotoId photoId, [FromBody] ChangePhotoDateRequest request)
    {
        var date = PhotoDate.Parse(request.Year, request.Month, request.Day);
        if (date.IsFailure) return ErrorMapping.ToActionResult(date.Error);

        var result = await photoManager.ChangeDateAsync(photoId, date.Value);
        return result.ToActionResult();
    }

    [HttpDelete("photos/{photoId:guid}/date")]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ClearDate(PhotoId photoId)
    {
        var result = await photoManager.ClearDateAsync(photoId);
        return result.ToActionResult();
    }

    [HttpDelete("photos/delete-batch")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteBatch([FromBody] DeletePhotosBatchRequest request)
    {
        var result = await photoManager.DeleteBatchAsync(request.PhotoIds, request.Reason);
        return result.ToActionResult(Ok(new { success = true }));
    }

    [HttpPut("photos/date-batch")]
    [ProducesResponseType(typeof(IEnumerable<PhotoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ChangeDateBatch([FromBody] ChangePhotoDateBatchRequest request)
    {
        var date = PhotoDate.Parse(request.Year, request.Month, request.Day);
        if (date.IsFailure) return ErrorMapping.ToActionResult(date.Error);

        var result = await photoManager.ChangeDateBatchAsync(request.PhotoIds, date.Value);
        return result.ToActionResult();
    }

    [HttpDelete("photos/date-batch")]
    [ProducesResponseType(typeof(IEnumerable<PhotoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ClearDateBatch([FromBody] ClearPhotoDateBatchRequest request)
    {
        var result = await photoManager.ClearDateBatchAsync(request.PhotoIds);
        return result.ToActionResult();
    }

    [HttpGet("baules/{baulId:guid}/photos")]
    [ProducesResponseType(typeof(PhotoPageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPage(BaulId baulId, [FromQuery] ChapterId? chapterId, [FromQuery] int skip = 0, [FromQuery] int take = 60)
    {
        var result = await photoReadManager.GetPageAsync(baulId, chapterId, skip, take);
        return result.ToActionResult();
    }

    [HttpGet("baules/{baulId:guid}/photos/sueltas")]
    [ProducesResponseType(typeof(IEnumerable<PhotoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLoose(BaulId baulId)
    {
        var result = await photoReadManager.GetLooseByBaulIdAsync(baulId);
        return result.ToActionResult();
    }

    [HttpGet("baules/{baulId:guid}/photos/untagged-suggestion")]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUntaggedSuggestion(BaulId baulId)
    {
        var result = await photoReadManager.GetUntaggedSuggestionAsync(baulId);
        return result.ToActionResult();
    }

    [HttpGet("baules/{baulId:guid}/photos/memory-suggestion")]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMemorySuggestion(BaulId baulId)
    {
        var result = await photoReadManager.GetMemorySuggestionAsync(baulId);
        return result.ToActionResult();
    }

    [HttpGet("baules/{baulId:guid}/personas/{personaId:guid}/photos")]
    [ProducesResponseType(typeof(IEnumerable<PhotoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByPersona(BaulId baulId, PersonaId personaId)
    {
        var result = await photoReadManager.GetByPersonaIdAsync(baulId, personaId);
        return result.ToActionResult();
    }

    [HttpGet("baules/{baulId:guid}/photo-batches/{batchId:guid}/photos")]
    [ProducesResponseType(typeof(IEnumerable<PhotoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByBatch(BaulId baulId, Guid batchId)
    {
        var result = await photoReadManager.GetBatchPhotosAsync(baulId, batchId);
        return result.ToActionResult();
    }

    [HttpPut("photos/{photoId:guid}/no-personas")]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ConfirmNoPersonas(PhotoId photoId)
    {
        var result = await photoManager.ConfirmNoPersonasAsync(photoId);
        return result.ToActionResult();
    }

    [HttpPost("baules/{baulId:guid}/photos/sueltas")]
    // Kept in sync manually with ImagePolicy.DefaultMaxUploadBytes (ElBaul/Application/Photos/ImagePolicy.cs)
    // — controllers can't reference Application types (see docs/architecture/backend.md), and this
    // attribute needs a compile-time constant, so it can't reference that type either.
    [RequestSizeLimit(25_000_000)]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadLoose(BaulId baulId, [FromForm] UploadPhotoRequest request)
    {
        if (request.File is null || request.File.Length == 0)
            return BadRequest(new { error = "No file provided" });

        if (request.ClientUploadId is not { } clientUploadId)
            return BadRequest(new { error = "ClientUploadId is required" });

        await using var stream = request.File.OpenReadStream();
        var result = await photoManager.UploadToBaulAsync(baulId, stream, clientUploadId, request.UploadBatchId);

        return result.ToActionResult();
    }

    [HttpGet("photos/{photoId:guid}/recuerdos")]
    [ProducesResponseType(typeof(IEnumerable<RecuerdoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecuerdos(PhotoId photoId)
    {
        var result = await recuerdoManager.GetRecuerdosAsync(photoId);
        return result.ToActionResult();
    }

    [HttpGet("photos/{photoId:guid}/download")]
    [Produces("application/octet-stream")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Download(PhotoId photoId)
    {
        var result = await photoReadManager.DownloadAsync(photoId);
        if (result.IsFailure) return ErrorMapping.ToActionResult(result.Error);

        var download = result.Value;
        return File(download.Content, download.ContentType, download.FileName);
    }

    [HttpPost("photos/{photoId:guid}/recuerdos")]
    [ProducesResponseType(typeof(RecuerdoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateRecuerdo(PhotoId photoId, [FromBody] CreateRecuerdoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var result = await recuerdoManager.CreateRecuerdoAsync(photoId, request.Text);
        return result.ToActionResult();
    }

    [HttpPut("recuerdos/{recuerdoId:guid}")]
    [ProducesResponseType(typeof(RecuerdoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateRecuerdo(RecuerdoId recuerdoId, [FromBody] UpdateRecuerdoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var result = await recuerdoManager.UpdateRecuerdoAsync(recuerdoId, request.Text);
        return result.ToActionResult();
    }

    [HttpPut("photos/tag-batch")]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TagBatch([FromBody] TagPhotosBatchRequest request)
    {
        var result = await photoPersonaTagManager.AddTaggedPersonasBatchAsync(request.BaulId, request.PhotoIds, request.PersonaIds);
        return result.ToActionResult();
    }

    [HttpGet("photos/{photoId:guid}/personas")]
    [ProducesResponseType(typeof(IEnumerable<TaggedPersonaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTaggedPersonas(PhotoId photoId)
    {
        var result = await photoPersonaTagManager.GetTaggedPersonasAsync(photoId);
        return result.ToActionResult();
    }

    [HttpPut("photos/{photoId:guid}/personas")]
    [ProducesResponseType(typeof(IEnumerable<TaggedPersonaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetTaggedPersonas(PhotoId photoId, [FromBody] SetPhotoPersonaTagsRequest request)
    {
        var result = await photoPersonaTagManager.SetTaggedPersonasAsync(photoId, request.PersonaIds);
        return result.ToActionResult();
    }
}
