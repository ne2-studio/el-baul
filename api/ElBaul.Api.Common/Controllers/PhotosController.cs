using ElBaul.Api.Models;
using ElBaul.InputPorts.Personas;
using ElBaul.InputPorts.Photos;
using ElBaul.InputPorts.Recuerdos;
using ElBaul.OutputPorts.Photos;
using ElBaul.Shared;

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
    public async Task<IActionResult> GetByChapter(ChapterId chapterId)
    {
        var result = await photoManager.GetByChapterIdAsync(chapterId);
        return result.ToActionResult();
    }

    [HttpPost("chapters/{chapterId:guid}/photos")]
    [RequestSizeLimit(20_000_000)]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Upload(ChapterId chapterId, [FromForm] UploadPhotoRequest request)
    {
        if (request.File is null || request.File.Length == 0)
            return BadRequest(new { error = "No file provided" });

        if (request.ClientUploadId is not { } clientUploadId)
            return BadRequest(new { error = "ClientUploadId is required" });

        var date = ParseDate(request);
        if (date.IsFailure) return ErrorMapping.ToActionResult(date.Error);

        await using var stream = request.File.OpenReadStream();
        var result = await photoManager.UploadAsync(
            chapterId, stream, request.File.FileName, request.File.ContentType, date.Value,
            clientUploadId, request.UploadBatchId);

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

    [HttpPut("photos/date-batch")]
    [ProducesResponseType(typeof(IEnumerable<PhotoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ChangeDateBatch([FromBody] ChangePhotoDateBatchRequest request)
    {
        var date = PhotoDate.Parse(request.Year, request.Month, request.Day);
        if (date.IsFailure) return ErrorMapping.ToActionResult(date.Error);

        var result = await photoManager.ChangeDateBatchAsync(request.PhotoIds, date.Value);
        return result.ToActionResult();
    }

    [HttpGet("baules/{baulId:guid}/photos")]
    [ProducesResponseType(typeof(PhotoPageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPage(BaulId baulId, [FromQuery] ChapterId? chapterId, [FromQuery] int skip = 0, [FromQuery] int take = 60)
    {
        var result = await photoManager.GetPageAsync(baulId, chapterId, skip, take);
        return result.ToActionResult();
    }

    [HttpGet("baules/{baulId:guid}/photos/sueltas")]
    [ProducesResponseType(typeof(IEnumerable<PhotoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLoose(BaulId baulId)
    {
        var result = await photoManager.GetLooseByBaulIdAsync(baulId);
        return result.ToActionResult();
    }

    [HttpGet("baules/{baulId:guid}/photos/untagged-suggestion")]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUntaggedSuggestion(BaulId baulId)
    {
        var result = await photoManager.GetUntaggedSuggestionAsync(baulId);
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
    [RequestSizeLimit(20_000_000)]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadLoose(BaulId baulId, [FromForm] UploadPhotoRequest request)
    {
        if (request.File is null || request.File.Length == 0)
            return BadRequest(new { error = "No file provided" });

        if (request.ClientUploadId is not { } clientUploadId)
            return BadRequest(new { error = "ClientUploadId is required" });

        var date = ParseDate(request);
        if (date.IsFailure) return ErrorMapping.ToActionResult(date.Error);

        await using var stream = request.File.OpenReadStream();
        var result = await photoManager.UploadToBaulAsync(
            baulId, stream, request.File.FileName, request.File.ContentType, date.Value,
            clientUploadId, request.UploadBatchId);

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
        var result = await photoManager.DownloadAsync(photoId);
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
