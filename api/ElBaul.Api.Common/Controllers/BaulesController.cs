using ElBaul.Api.Models;
using ElBaul.Core.Bauls.InputPorts;
using ElBaul.Core.Sharing.InputPorts;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using ElBaul.Domain;
namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/baules")]
public class BaulesController(IBaulManager baulManager, IBaulInviteLinkManager baulInviteLinkManager) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<BaulDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var result = await baulManager.GetAllForCurrentUserAsync();
        return result.ToActionResult();
    }

    [HttpPost]
    [ProducesResponseType(typeof(BaulDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Create([FromBody] CreateBaulRequest request)
    {
        var result = await baulManager.CreateAsync(request.Name, request.Description);
        return result.ToActionResult();
    }

    [HttpGet("{baulId:guid}")]
    [ProducesResponseType(typeof(BaulDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(BaulId baulId)
    {
        var result = await baulManager.GetByIdAsync(baulId);
        return result.ToActionResult();
    }

    [HttpPut("{baulId:guid}/cover")]
    [ProducesResponseType(typeof(BaulDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetCover(BaulId baulId, [FromBody] SetBaulCoverRequest request)
    {
        var crop = PhotoCrop.Create(request.CropX, request.CropY, request.CropScale);
        if (crop.IsFailure) return ErrorMapping.ToActionResult(crop.Error);

        var result = await baulManager.SetCoverAsync(baulId, request.PhotoId, crop.Value);
        return result.ToActionResult();
    }

    [HttpPut("{baulId:guid}")]
    [ProducesResponseType(typeof(BaulDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(BaulId baulId, [FromBody] UpdateBaulRequest request)
    {
        var result = await baulManager.UpdateAsync(baulId, request.Name, request.Description);
        return result.ToActionResult();
    }

    [HttpGet("{baulId:guid}/invite-link")]
    [ProducesResponseType(typeof(BaulInviteLinkDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetInviteLink(BaulId baulId)
    {
        var result = await baulInviteLinkManager.GetOrCreateAsync(baulId);
        return result.ToActionResult();
    }

    [HttpPost("{baulId:guid}/invite-link/regenerate")]
    [ProducesResponseType(typeof(BaulInviteLinkDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RegenerateInviteLink(BaulId baulId)
    {
        var result = await baulInviteLinkManager.RegenerateAsync(baulId);
        return result.ToActionResult();
    }
}
