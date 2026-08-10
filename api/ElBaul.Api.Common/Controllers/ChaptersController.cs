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
[Route("api/baules/{baulId:guid}/chapters")]
public class ChaptersController(IChapterManager chapterManager, IRecuerdoManager recuerdoManager) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ChapterDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(Guid baulId)
    {
        var result = await chapterManager.GetByBaulIdAsync(new BaulId(baulId));
        return result.ToActionResult();
    }

    [HttpPost]
    [ProducesResponseType(typeof(ChapterDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Create(Guid baulId, [FromBody] CreateChapterRequest request)
    {
        var result = await chapterManager.CreateAsync(new BaulId(baulId), request.Name);
        return result.ToActionResult();
    }

    [HttpPut("{chapterId:guid}")]
    [ProducesResponseType(typeof(ChapterDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid baulId, Guid chapterId, [FromBody] UpdateChapterRequest request)
    {
        var result = await chapterManager.UpdateAsync(new ChapterId(chapterId), request.Name);
        return result.ToActionResult();
    }

    [HttpDelete("{chapterId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid baulId, Guid chapterId)
    {
        var result = await chapterManager.DeleteAsync(new ChapterId(chapterId));
        return result.ToActionResult(NoContent());
    }

    [HttpPut("{chapterId:guid}/cover")]
    [ProducesResponseType(typeof(ChapterDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetCover(Guid baulId, Guid chapterId, [FromBody] SetChapterCoverRequest request)
    {
        var photoId = PhotoId.Parse(request.PhotoId);
        if (photoId.IsFailure) return ErrorMapping.ToActionResult(photoId.Error);

        var result = await chapterManager.SetCoverAsync(new ChapterId(chapterId), photoId.Value);
        return result.ToActionResult();
    }

    [HttpGet("{chapterId:guid}/recuerdos")]
    [ProducesResponseType(typeof(IEnumerable<RecuerdoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecuerdos(Guid baulId, Guid chapterId)
    {
        var result = await recuerdoManager.GetRecuerdosAsync(new ChapterId(chapterId));
        return result.ToActionResult();
    }

    [HttpPost("{chapterId:guid}/recuerdos")]
    [ProducesResponseType(typeof(RecuerdoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateRecuerdo(Guid baulId, Guid chapterId, [FromBody] CreateRecuerdoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var result = await recuerdoManager.CreateRecuerdoAsync(new ChapterId(chapterId), request.Text);
        return result.ToActionResult();
    }
}
