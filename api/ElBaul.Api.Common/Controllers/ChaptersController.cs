using ElBaul.Api.Models;
using ElBaul.Ports.Input;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/baules/{baulId:guid}/chapters")]
public class ChaptersController(IChapterManager chapterManager) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid baulId)
    {
        var result = await chapterManager.GetByBaulIdAsync(baulId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid baulId, [FromBody] CreateChapterRequest request)
    {
        var result = await chapterManager.CreateAsync(baulId, request.Name);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("{chapterId:guid}")]
    public async Task<IActionResult> Update(Guid baulId, Guid chapterId, [FromBody] UpdateChapterRequest request)
    {
        var result = await chapterManager.UpdateAsync(chapterId, request.Name);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpDelete("{chapterId:guid}")]
    public async Task<IActionResult> Delete(Guid baulId, Guid chapterId)
    {
        var result = await chapterManager.DeleteAsync(chapterId);
        return result.IsSuccess ? NoContent() : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("{chapterId:guid}/cover")]
    public async Task<IActionResult> SetCover(Guid baulId, Guid chapterId, [FromBody] SetChapterCoverRequest request)
    {
        if (!Guid.TryParse(request.PhotoId, out var photoId))
            return BadRequest(new { error = $"'{request.PhotoId}' is not a valid photo id." });

        var result = await chapterManager.SetCoverAsync(chapterId, photoId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("{chapterId:guid}/recuerdos")]
    public async Task<IActionResult> GetRecuerdos(Guid baulId, Guid chapterId)
    {
        var result = await chapterManager.GetRecuerdosAsync(chapterId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("{chapterId:guid}/recuerdos")]
    public async Task<IActionResult> CreateRecuerdo(Guid baulId, Guid chapterId, [FromBody] CreateRecuerdoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var result = await chapterManager.CreateRecuerdoAsync(chapterId, request.Text);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }
}
