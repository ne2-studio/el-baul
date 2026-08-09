using ElBaul.Api.Models;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
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
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
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

        if (!TryBuildDate(request, out var date, out var dateError))
            return BadRequest(new { error = dateError });

        await using var stream = request.File.OpenReadStream();
        var result = await photoManager.UploadAsync(
            new ChapterId(chapterId), stream, request.File.FileName, request.File.ContentType, date,
            new ClientUploadId(request.ClientUploadId.Value), request.UploadBatchId);

        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("photos/{photoId:guid}/chapter")]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Move(Guid photoId, [FromBody] MovePhotoRequest request)
    {
        if (!Guid.TryParse(request.ChapterId, out var chapterId))
            return BadRequest(new { error = $"'{request.ChapterId}' is not a valid chapter id." });

        var result = await photoManager.MoveAsync(new PhotoId(photoId), new ChapterId(chapterId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpDelete("photos/{photoId:guid}")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Delete(Guid photoId, [FromBody] DeletePhotoRequest request)
    {
        var result = await photoManager.DeleteAsync(new PhotoId(photoId), request.Reason);
        return result.IsSuccess ? Ok(new { success = true }) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("photos/{photoId:guid}/date")]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ChangeDate(Guid photoId, [FromBody] ChangePhotoDateRequest request)
    {
        if (!PhotoDate.TryCreate(request.Year, request.Month, request.Day, out var date, out var error))
            return BadRequest(new { error });

        var result = await photoManager.ChangeDateAsync(new PhotoId(photoId), date);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("photos/date-batch")]
    [ProducesResponseType(typeof(IEnumerable<PhotoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ChangeDateBatch([FromBody] ChangePhotoDateBatchRequest request)
    {
        if (!PhotoDate.TryCreate(request.Year, request.Month, request.Day, out var date, out var error))
            return BadRequest(new { error });

        var photoIds = new List<PhotoId>();
        foreach (var id in request.PhotoIds)
        {
            if (!Guid.TryParse(id, out var photoId))
                return BadRequest(new { error = $"'{id}' is not a valid photo id." });
            photoIds.Add(new PhotoId(photoId));
        }

        var result = await photoManager.ChangeDateBatchAsync(photoIds, date);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("baules/{baulId:guid}/photos")]
    [ProducesResponseType(typeof(PhotoPageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPage(Guid baulId, [FromQuery] Guid? chapterId, [FromQuery] int skip = 0, [FromQuery] int take = 60)
    {
        var result = await photoManager.GetPageAsync(
            new BaulId(baulId), chapterId is { } cId ? new ChapterId(cId) : null, skip, take);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("baules/{baulId:guid}/photos/sueltas")]
    [ProducesResponseType(typeof(IEnumerable<PhotoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLoose(Guid baulId)
    {
        var result = await photoManager.GetLooseByBaulIdAsync(new BaulId(baulId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("baules/{baulId:guid}/photos/untagged-suggestion")]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUntaggedSuggestion(Guid baulId)
    {
        var result = await photoManager.GetUntaggedSuggestionAsync(new BaulId(baulId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("photos/{photoId:guid}/no-personas")]
    [ProducesResponseType(typeof(PhotoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ConfirmNoPersonas(Guid photoId)
    {
        var result = await photoManager.ConfirmNoPersonasAsync(new PhotoId(photoId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
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

        if (!TryBuildDate(request, out var date, out var dateError))
            return BadRequest(new { error = dateError });

        await using var stream = request.File.OpenReadStream();
        var result = await photoManager.UploadToBaulAsync(
            new BaulId(baulId), stream, request.File.FileName, request.File.ContentType, date,
            new ClientUploadId(request.ClientUploadId.Value), request.UploadBatchId);

        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("photos/{photoId:guid}/recuerdos")]
    [ProducesResponseType(typeof(IEnumerable<RecuerdoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecuerdos(Guid photoId)
    {
        var result = await recuerdoManager.GetRecuerdosAsync(new PhotoId(photoId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
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
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("recuerdos/{recuerdoId:guid}")]
    [ProducesResponseType(typeof(RecuerdoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateRecuerdo(Guid recuerdoId, [FromBody] UpdateRecuerdoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var result = await recuerdoManager.UpdateRecuerdoAsync(new RecuerdoId(recuerdoId), request.Text);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("photos/tag-batch")]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TagBatch([FromBody] TagPhotosBatchRequest request)
    {
        if (!Guid.TryParse(request.BaulId, out var baulId))
            return BadRequest(new { error = $"'{request.BaulId}' is not a valid baúl id." });

        var photoIds = new List<PhotoId>();
        foreach (var id in request.PhotoIds)
        {
            if (!Guid.TryParse(id, out var photoId))
                return BadRequest(new { error = $"'{id}' is not a valid photo id." });
            photoIds.Add(new PhotoId(photoId));
        }

        var personaIds = new List<PersonaId>();
        foreach (var id in request.PersonaIds)
        {
            if (!Guid.TryParse(id, out var personaId))
                return BadRequest(new { error = $"'{id}' is not a valid persona id." });
            personaIds.Add(new PersonaId(personaId));
        }

        var result = await photoPersonaTagManager.AddTaggedPersonasBatchAsync(new BaulId(baulId), photoIds, personaIds);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("photos/{photoId:guid}/personas")]
    [ProducesResponseType(typeof(IEnumerable<TaggedPersonaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTaggedPersonas(Guid photoId)
    {
        var result = await photoPersonaTagManager.GetTaggedPersonasAsync(new PhotoId(photoId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("photos/{photoId:guid}/personas")]
    [ProducesResponseType(typeof(IEnumerable<TaggedPersonaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetTaggedPersonas(Guid photoId, [FromBody] SetPhotoPersonaTagsRequest request)
    {
        var personaIds = new List<PersonaId>();
        foreach (var id in request.PersonaIds)
        {
            if (!Guid.TryParse(id, out var personaId))
                return BadRequest(new { error = $"'{id}' is not a valid persona id." });
            personaIds.Add(new PersonaId(personaId));
        }

        var result = await photoPersonaTagManager.SetTaggedPersonasAsync(new PhotoId(photoId), personaIds);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    // Optional at the wire level (a photo may upload with no known date at all, falling back to
    // EXIF extraction downstream) but validated here if present, so an invalid year/month/day
    // never crosses the IPhotoManager boundary.
    private static bool TryBuildDate(UploadPhotoRequest request, out PhotoDate? date, out string? error)
    {
        if (request.DateYear is not { } year)
        {
            date = null;
            error = null;
            return true;
        }

        var ok = PhotoDate.TryCreate(year, request.DateMonth, request.DateDay, out var created, out error);
        date = ok ? created : null;
        return ok;
    }
}
