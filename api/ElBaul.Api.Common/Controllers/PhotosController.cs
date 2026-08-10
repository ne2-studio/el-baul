using ElBaul.Api.Models;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using ElBaul.Ports.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api")]
public class PhotosController(
    IPhotoManager photoManager, IRecuerdoManager recuerdoManager, IPhotoPersonaTagManager photoPersonaTagManager)
    : ControllerBase
{
    [HttpGet("chapters/{chapterId:guid}/photos")]
    [ProducesResponseType(typeof(IEnumerable<PhotoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByChapter(Guid chapterId)
    {
        var result = await photoManager.GetByChapterIdAsync(new ChapterId(chapterId));
        return result.ToActionResult();
    }

    [HttpPost("chapters/{chapterId:guid}/photos")]
    [RequestSizeLimit(20_000_000)]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Upload(Guid chapterId, [FromForm] UploadPhotoRequest request)
    {
        if (request.File is null || request.File.Length == 0)
            return BadRequest(new { error = "No file provided" });

        if (request.ClientUploadId is null)
            return BadRequest(new { error = "ClientUploadId is required" });

        var date = ParseDate(request);
        if (date.IsFailure) return ErrorMapping.ToActionResult(date.Error);

        await using var stream = request.File.OpenReadStream();
        var result = await photoManager.UploadAsync(
            new ChapterId(chapterId), stream, request.File.FileName, request.File.ContentType, date.Value,
            new ClientUploadId(request.ClientUploadId.Value), request.UploadBatchId);

        return result.ToActionResult();
    }

    [HttpPut("photos/{photoId:guid}/chapter")]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Move(Guid photoId, [FromBody] MovePhotoRequest request)
    {
        var chapterId = ChapterId.Parse(request.ChapterId);
        if (chapterId.IsFailure) return ErrorMapping.ToActionResult(chapterId.Error);

        var result = await photoManager.MoveAsync(new PhotoId(photoId), chapterId.Value);
        return result.ToActionResult();
    }

    [HttpDelete("photos/{photoId:guid}")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Delete(Guid photoId, [FromBody] DeletePhotoRequest request)
    {
        var result = await photoManager.DeleteAsync(new PhotoId(photoId), request.Reason);
        return result.ToActionResult(Ok(new { success = true }));
    }

    [HttpPut("photos/{photoId:guid}/date")]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ChangeDate(Guid photoId, [FromBody] ChangePhotoDateRequest request)
    {
        var date = PhotoDate.Parse(request.Year, request.Month, request.Day);
        if (date.IsFailure) return ErrorMapping.ToActionResult(date.Error);

        var result = await photoManager.ChangeDateAsync(new PhotoId(photoId), date.Value);
        return result.ToActionResult();
    }

    [HttpPut("photos/date-batch")]
    [ProducesResponseType(typeof(IEnumerable<PhotoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ChangeDateBatch([FromBody] ChangePhotoDateBatchRequest request)
    {
        var date = PhotoDate.Parse(request.Year, request.Month, request.Day);
        if (date.IsFailure) return ErrorMapping.ToActionResult(date.Error);

        var photoIds = Result.Traverse(request.PhotoIds, PhotoId.Parse);
        if (photoIds.IsFailure) return ErrorMapping.ToActionResult(photoIds.Error);

        var result = await photoManager.ChangeDateBatchAsync(photoIds.Value, date.Value);
        return result.ToActionResult();
    }

    [HttpGet("baules/{baulId:guid}/photos")]
    [ProducesResponseType(typeof(PhotoPageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPage(Guid baulId, [FromQuery] Guid? chapterId, [FromQuery] int skip = 0, [FromQuery] int take = 60)
    {
        var result = await photoManager.GetPageAsync(
            new BaulId(baulId), chapterId is { } cId ? new ChapterId(cId) : null, skip, take);
        return result.ToActionResult();
    }

    [HttpGet("baules/{baulId:guid}/photos/sueltas")]
    [ProducesResponseType(typeof(IEnumerable<PhotoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLoose(Guid baulId)
    {
        var result = await photoManager.GetLooseByBaulIdAsync(new BaulId(baulId));
        return result.ToActionResult();
    }

    [HttpGet("baules/{baulId:guid}/photos/untagged-suggestion")]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUntaggedSuggestion(Guid baulId)
    {
        var result = await photoManager.GetUntaggedSuggestionAsync(new BaulId(baulId));
        return result.ToActionResult();
    }

    [HttpPut("photos/{photoId:guid}/no-personas")]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ConfirmNoPersonas(Guid photoId)
    {
        var result = await photoManager.ConfirmNoPersonasAsync(new PhotoId(photoId));
        return result.ToActionResult();
    }

    [HttpPost("baules/{baulId:guid}/photos/sueltas")]
    [RequestSizeLimit(20_000_000)]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadLoose(Guid baulId, [FromForm] UploadPhotoRequest request)
    {
        if (request.File is null || request.File.Length == 0)
            return BadRequest(new { error = "No file provided" });

        if (request.ClientUploadId is null)
            return BadRequest(new { error = "ClientUploadId is required" });

        var date = ParseDate(request);
        if (date.IsFailure) return ErrorMapping.ToActionResult(date.Error);

        await using var stream = request.File.OpenReadStream();
        var result = await photoManager.UploadToBaulAsync(
            new BaulId(baulId), stream, request.File.FileName, request.File.ContentType, date.Value,
            new ClientUploadId(request.ClientUploadId.Value), request.UploadBatchId);

        return result.ToActionResult();
    }

    [HttpGet("photos/{photoId:guid}/recuerdos")]
    [ProducesResponseType(typeof(IEnumerable<RecuerdoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecuerdos(Guid photoId)
    {
        var result = await recuerdoManager.GetRecuerdosAsync(new PhotoId(photoId));
        return result.ToActionResult();
    }

    [HttpGet("photos/{photoId:guid}/download")]
    [Produces("application/octet-stream")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Download(Guid photoId)
    {
        var result = await photoManager.DownloadAsync(new PhotoId(photoId));
        if (result.IsFailure) return ErrorMapping.ToActionResult(result.Error);

        var download = result.Value;
        return File(download.Content, download.ContentType, download.FileName);
    }

    [HttpPost("photos/{photoId:guid}/recuerdos")]
    [ProducesResponseType(typeof(RecuerdoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateRecuerdo(Guid photoId, [FromBody] CreateRecuerdoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var result = await recuerdoManager.CreateRecuerdoAsync(new PhotoId(photoId), request.Text);
        return result.ToActionResult();
    }

    [HttpPut("recuerdos/{recuerdoId:guid}")]
    [ProducesResponseType(typeof(RecuerdoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateRecuerdo(Guid recuerdoId, [FromBody] UpdateRecuerdoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var result = await recuerdoManager.UpdateRecuerdoAsync(new RecuerdoId(recuerdoId), request.Text);
        return result.ToActionResult();
    }

    [HttpPut("photos/tag-batch")]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TagBatch([FromBody] TagPhotosBatchRequest request)
    {
        var baulId = BaulId.Parse(request.BaulId);
        if (baulId.IsFailure) return ErrorMapping.ToActionResult(baulId.Error);

        var photoIds = Result.Traverse(request.PhotoIds, PhotoId.Parse);
        if (photoIds.IsFailure) return ErrorMapping.ToActionResult(photoIds.Error);

        var personaIds = Result.Traverse(request.PersonaIds, PersonaId.Parse);
        if (personaIds.IsFailure) return ErrorMapping.ToActionResult(personaIds.Error);

        var result = await photoPersonaTagManager.AddTaggedPersonasBatchAsync(baulId.Value, photoIds.Value, personaIds.Value);
        return result.ToActionResult();
    }

    [HttpGet("photos/{photoId:guid}/personas")]
    [ProducesResponseType(typeof(IEnumerable<TaggedPersonaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTaggedPersonas(Guid photoId)
    {
        var result = await photoPersonaTagManager.GetTaggedPersonasAsync(new PhotoId(photoId));
        return result.ToActionResult();
    }

    [HttpPut("photos/{photoId:guid}/personas")]
    [ProducesResponseType(typeof(IEnumerable<TaggedPersonaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetTaggedPersonas(Guid photoId, [FromBody] SetPhotoPersonaTagsRequest request)
    {
        var personaIds = Result.Traverse(request.PersonaIds, PersonaId.Parse);
        if (personaIds.IsFailure) return ErrorMapping.ToActionResult(personaIds.Error);

        var result = await photoPersonaTagManager.SetTaggedPersonasAsync(new PhotoId(photoId), personaIds.Value);
        return result.ToActionResult();
    }

    // Optional at the wire level (a photo may upload with no known date at all, falling back to
    // EXIF extraction downstream) but validated here if present, so an invalid year/month/day
    // never crosses the IPhotoManager boundary. PhotoDate.Parse itself owns the actual validation
    // rule — this only adapts its "no year at all" case, which Parse's required-year signature
    // can't express, into a Result<PhotoDate?>.
    private static Result<PhotoDate?> ParseDate(UploadPhotoRequest request) =>
        request.DateYear is not { } year
            ? Result.Success<PhotoDate?>(null)
            : PhotoDate.Parse(year, request.DateMonth, request.DateDay).Map(d => (PhotoDate?)d);
}
