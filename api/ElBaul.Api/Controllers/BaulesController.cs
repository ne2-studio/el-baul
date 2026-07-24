using ElBaul.Api.Models;
using ElBaul.Ports.Input;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/baules")]
public class BaulesController(IBaulManager baulManager) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await baulManager.GetAllForCurrentUserAsync();
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBaulRequest request)
    {
        var result = await baulManager.CreateAsync(request.Name, request.Description);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("{baulId:guid}")]
    public async Task<IActionResult> GetById(Guid baulId)
    {
        var result = await baulManager.GetByIdAsync(baulId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("{baulId:guid}/cover")]
    public async Task<IActionResult> SetCover(Guid baulId, [FromBody] SetBaulCoverRequest request)
    {
        if (!Guid.TryParse(request.PhotoId, out var photoId))
            return BadRequest(new { error = $"'{request.PhotoId}' is not a valid photo id." });

        var result = await baulManager.SetCoverAsync(baulId, photoId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("{baulId:guid}")]
    public async Task<IActionResult> Update(Guid baulId, [FromBody] UpdateBaulRequest request)
    {
        var result = await baulManager.UpdateAsync(baulId, request.Name, request.Description);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [AllowAnonymous]
    [EnableRateLimiting("PublicLimiter")]
    [HttpGet("/api/personas/{personaId:guid}/invite-preview")]
    public async Task<IActionResult> GetInvitePreview(Guid personaId)
    {
        var result = await baulManager.GetInvitePreviewAsync(personaId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("/api/personas/{personaId:guid}/accept-invite")]
    public async Task<IActionResult> AcceptPersonalInvite(Guid personaId)
    {
        var result = await baulManager.AcceptPersonalInviteAsync(personaId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("{baulId:guid}/personas")]
    public async Task<IActionResult> GetPersonas(Guid baulId)
    {
        var result = await baulManager.GetPersonasAsync(baulId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("{baulId:guid}/personas")]
    public async Task<IActionResult> CreatePersona(Guid baulId, [FromBody] CreatePersonaRequest request)
    {
        var result = await baulManager.CreatePersonaAsync(baulId, request.Nickname);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("{baulId:guid}/personas/{personaId:guid}")]
    public async Task<IActionResult> GetPersona(Guid baulId, Guid personaId)
    {
        var result = await baulManager.GetPersonaAsync(baulId, personaId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("{baulId:guid}/personas/{personaId:guid}")]
    public async Task<IActionResult> UpdatePersona(Guid baulId, Guid personaId, [FromBody] UpdatePersonaRequest request)
    {
        var result = await baulManager.UpdatePersonaAsync(baulId, personaId, request.Name, request.Nickname);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("{baulId:guid}/personas/{personaId:guid}/avatar")]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> UploadPersonaAvatar(
        Guid baulId, Guid personaId, [FromForm] UploadPersonaAvatarRequest request)
    {
        if (request.File is null || request.File.Length == 0)
            return BadRequest(new { error = "No file provided" });

        await using var stream = request.File.OpenReadStream();
        var result = await baulManager.UpdatePersonaAvatarAsync(
            baulId, personaId, stream, request.File.FileName, request.File.ContentType);

        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("{baulId:guid}/personas/{personaId:guid}/role")]
    public async Task<IActionResult> UpdatePersonaRole(Guid baulId, Guid personaId, [FromBody] UpdateRoleRequest request)
    {
        var result = await baulManager.UpdatePersonaRoleAsync(baulId, personaId, request.Role);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpDelete("{baulId:guid}/personas/{personaId:guid}")]
    public async Task<IActionResult> RemovePersona(Guid baulId, Guid personaId)
    {
        var result = await baulManager.RemovePersonaAsync(baulId, personaId);
        return result.IsSuccess ? Ok(new { success = true }) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("{baulId:guid}/removal-requests")]
    public async Task<IActionResult> GetRemovalRequests(Guid baulId)
    {
        var result = await baulManager.GetRemovalRequestsAsync(baulId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("{baulId:guid}/removal-requests")]
    public async Task<IActionResult> CreateRemovalRequest(Guid baulId, [FromBody] CreateRemovalRequestRequest request)
    {
        if (!Guid.TryParse(request.PhotoId, out var photoId))
            return BadRequest(new { error = $"'{request.PhotoId}' is not a valid photo id." });

        var result = await baulManager.CreateRemovalRequestAsync(baulId, photoId, request.Reason);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("{baulId:guid}/removal-requests/{requestId:guid}/approve")]
    public async Task<IActionResult> ApproveRemovalRequest(Guid baulId, Guid requestId)
    {
        var result = await baulManager.ApproveRemovalRequestAsync(baulId, requestId);
        return result.IsSuccess ? Ok(new { success = true }) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("{baulId:guid}/removal-requests/{requestId:guid}/reject")]
    public async Task<IActionResult> RejectRemovalRequest(Guid baulId, Guid requestId)
    {
        var result = await baulManager.RejectRemovalRequestAsync(baulId, requestId);
        return result.IsSuccess ? Ok(new { success = true }) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("{baulId:guid}/recuerdos")]
    public async Task<IActionResult> GetRecuerdos(Guid baulId)
    {
        var result = await baulManager.GetRecuerdosAsync(baulId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("{baulId:guid}/recuerdos")]
    public async Task<IActionResult> CreateRecuerdo(Guid baulId, [FromBody] CreateRecuerdoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var result = await baulManager.CreateRecuerdoAsync(baulId, request.Text);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }
}
