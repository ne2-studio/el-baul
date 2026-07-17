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

    [AllowAnonymous]
    [EnableRateLimiting("PublicLimiter")]
    [HttpGet("{baulId:guid}/preview")]
    public async Task<IActionResult> GetPreview(Guid baulId)
    {
        var result = await baulManager.GetPreviewAsync(baulId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("{baulId:guid}/accept-invite")]
    public async Task<IActionResult> AcceptInvite(Guid baulId)
    {
        var result = await baulManager.AcceptInviteAsync(baulId);
        return result.IsSuccess ? Ok(new { success = true }) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("{baulId:guid}/shared-users")]
    public async Task<IActionResult> GetSharedUsers(Guid baulId)
    {
        var result = await baulManager.GetSharedUsersAsync(baulId);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("{baulId:guid}/share")]
    public async Task<IActionResult> Share(Guid baulId, [FromBody] ShareBaulRequest request)
    {
        var result = await baulManager.ShareAsync(baulId, request.Email, request.Role);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("{baulId:guid}/shared-users/{sharedUserId}/role")]
    public async Task<IActionResult> UpdateSharedUserRole(Guid baulId, string sharedUserId, [FromBody] UpdateRoleRequest request)
    {
        if (!Guid.TryParse(sharedUserId, out var parsedId))
            return BadRequest(new { error = $"'{sharedUserId}' is not a valid shared user id." });

        var result = await baulManager.UpdateSharedUserRoleAsync(baulId, parsedId, request.Role);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpDelete("{baulId:guid}/shared-users/{email}")]
    public async Task<IActionResult> RemoveSharedUser(Guid baulId, string email)
    {
        var result = await baulManager.RemoveSharedUserAsync(baulId, email);
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
}
