using ElBaul.Api.Models;
using ElBaul.Api.Scope;
using ElBaul.Core.Chapters;
using ElBaul.Core.Recuerdos;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using ElBaul.Domain;
namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/baules/{baulId:guid}/chapters")]
public class ChaptersController(IChapterManager chapterManager, IRecuerdoManager recuerdoManager, ChapterScopeAggregator chapterScopeAggregator)
    : ControllerBase
{
    // Aggregates everything ChapterRoute needs into one request — see
    // BaulScopeAggregator's doc comment (same rationale, no async-flag race here, just fewer
    // round-trips on a deep link/refresh).
    [HttpGet("{chapterId:guid}/scope")]
    [ProducesResponseType(typeof(ChapterScopeDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetScope(BaulId baulId, ChapterId chapterId)
    {
        var result = await chapterScopeAggregator.GetScopeAsync(chapterId);
        return result.ToActionResult();
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ChapterDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(BaulId baulId)
    {
        var result = await chapterManager.GetByBaulIdAsync(baulId);
        return result.ToActionResult();
    }

    [HttpPost]
    [ProducesResponseType(typeof(ChapterDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Create(BaulId baulId, [FromBody] CreateChapterRequest request)
    {
        var result = await chapterManager.CreateAsync(baulId, request.Name);
        return result.ToActionResult();
    }

    [HttpPut("{chapterId:guid}")]
    [ProducesResponseType(typeof(ChapterDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(BaulId baulId, ChapterId chapterId, [FromBody] UpdateChapterRequest request)
    {
        var result = await chapterManager.UpdateAsync(chapterId, request.Name);
        return result.ToActionResult();
    }

    [HttpDelete("{chapterId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(BaulId baulId, ChapterId chapterId)
    {
        var result = await chapterManager.DeleteAsync(chapterId);
        return result.ToActionResult(NoContent());
    }

    [HttpPut("{chapterId:guid}/cover")]
    [ProducesResponseType(typeof(ChapterDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetCover(BaulId baulId, ChapterId chapterId, [FromBody] SetChapterCoverRequest request)
    {
        var crop = ImageCrop.Create(request.CropX, request.CropY, request.CropScale);
        if (crop.IsFailure) return ErrorMapping.ToActionResult(crop.Error);

        var result = await chapterManager.SetCoverAsync(chapterId, request.PhotoId, crop.Value);
        return result.ToActionResult();
    }

    [HttpGet("{chapterId:guid}/recuerdos")]
    [ProducesResponseType(typeof(IEnumerable<RecuerdoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecuerdos(BaulId baulId, ChapterId chapterId)
    {
        var result = await recuerdoManager.GetRecuerdosAsync(chapterId);
        return result.ToActionResult();
    }

    [HttpPost("{chapterId:guid}/recuerdos")]
    [ProducesResponseType(typeof(RecuerdoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateRecuerdo(BaulId baulId, ChapterId chapterId, [FromBody] CreateRecuerdoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var result = await recuerdoManager.CreateRecuerdoAsync(chapterId, request.Text);
        return result.ToActionResult();
    }
}
