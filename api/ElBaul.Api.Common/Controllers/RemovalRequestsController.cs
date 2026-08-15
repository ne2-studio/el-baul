using ElBaul.Api.Models;
using ElBaul.InputPorts.Moderation;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using ElBaul.Domain;
namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/baules/{baulId:guid}/removal-requests")]
public class RemovalRequestsController(IRemovalRequestManager removalRequestManager) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<RemovalRequestDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(BaulId baulId)
    {
        var result = await removalRequestManager.GetRemovalRequestsAsync(baulId);
        return result.ToActionResult();
    }

    [HttpPost]
    [ProducesResponseType(typeof(RemovalRequestDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Create(BaulId baulId, [FromBody] CreateRemovalRequestRequest request)
    {
        var result = await removalRequestManager.CreateRemovalRequestAsync(baulId, request.PhotoId, request.Reason);
        return result.ToActionResult();
    }

    [HttpPost("{requestId:guid}/approve")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Approve(BaulId baulId, RemovalRequestId requestId)
    {
        var result = await removalRequestManager.ApproveRemovalRequestAsync(baulId, requestId);
        return result.ToActionResult(Ok(new { success = true }));
    }

    [HttpPost("{requestId:guid}/reject")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Reject(BaulId baulId, RemovalRequestId requestId)
    {
        var result = await removalRequestManager.RejectRemovalRequestAsync(baulId, requestId);
        return result.ToActionResult(Ok(new { success = true }));
    }
}
