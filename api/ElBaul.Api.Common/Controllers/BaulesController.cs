using ElBaul.Api.Models;
using ElBaul.Application.Feed;
using ElBaul.InputPorts.Bauls;
using ElBaul.InputPorts.Feed;
using ElBaul.InputPorts.Personas;
using ElBaul.InputPorts.Photos;
using ElBaul.InputPorts.Recuerdos;
using ElBaul.InputPorts.Sharing;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Shared;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using ElBaul.Domain;
namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/baules")]
public class BaulesController(
    IBaulManager baulManager, IPersonaManager personaManager, IRemovalRequestManager removalRequestManager,
    IPhotoManager photoManager, IRecuerdoManager recuerdoManager, IBaulInviteLinkManager baulInviteLinkManager,
    IBaulFeedManager baulFeedManager)
    : ControllerBase
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
        var result = await baulManager.SetCoverAsync(baulId, request.PhotoId);
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

    [HttpGet("{baulId:guid}/personas")]
    [ProducesResponseType(typeof(IEnumerable<PersonaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPersonas(BaulId baulId)
    {
        var result = await personaManager.GetPersonasAsync(baulId);
        return result.ToActionResult();
    }

    [HttpPost("{baulId:guid}/personas")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreatePersona(BaulId baulId, [FromBody] CreatePersonaRequest request)
    {
        var result = await personaManager.CreatePersonaAsync(baulId, request.Nickname);
        return result.ToActionResult();
    }

    [HttpGet("{baulId:guid}/personas/{personaId:guid}")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPersona(BaulId baulId, PersonaId personaId)
    {
        var result = await personaManager.GetPersonaAsync(baulId, personaId);
        return result.ToActionResult();
    }

    [HttpPut("{baulId:guid}/personas/{personaId:guid}")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdatePersona(BaulId baulId, PersonaId personaId, [FromBody] UpdatePersonaRequest request)
    {
        var result = await personaManager.UpdatePersonaAsync(baulId, personaId, request.Name, request.Nickname);
        return result.ToActionResult();
    }

    [HttpPut("{baulId:guid}/personas/{personaId:guid}/biografia")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdatePersonaBiografia(BaulId baulId, PersonaId personaId, [FromBody] UpdatePersonaBiografiaRequest request)
    {
        var result = await personaManager.UpdatePersonaBiografiaAsync(baulId, personaId, request.Biografia);
        return result.ToActionResult();
    }

    [HttpPost("{baulId:guid}/personas/{personaId:guid}/avatar")]
    [RequestSizeLimit(5_000_000)]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadPersonaAvatar(
        BaulId baulId, PersonaId personaId, [FromForm] UploadPersonaAvatarRequest request)
    {
        if (request.File is null || request.File.Length == 0)
            return BadRequest(new { error = "No file provided" });

        var crop = AvatarCrop.Create(request.CropX, request.CropY, request.CropScale);
        if (crop.IsFailure) return ErrorMapping.ToActionResult(crop.Error);

        // A missing/invalid client-generated idempotency token falls back to a fresh one rather
        // than failing the request — unlike every other id on this boundary, there is no wrong
        // answer to recover from here, so this deliberately isn't ClientUploadId.Parse.
        if (!Guid.TryParse(request.ClientUploadId, out var clientUploadId))
            clientUploadId = Guid.NewGuid();

        await using var stream = request.File.OpenReadStream();
        var result = await personaManager.UpdatePersonaAvatarAsync(
            baulId, personaId, stream, request.File.FileName, request.File.ContentType,
            crop.Value, new ClientUploadId(clientUploadId));

        return result.ToActionResult();
    }

    [HttpPut("{baulId:guid}/personas/{personaId:guid}/avatar")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetPersonaAvatarPhoto(
        BaulId baulId, PersonaId personaId, [FromBody] SetPersonaAvatarPhotoRequest request)
    {
        var crop = AvatarCrop.Create(request.CropX, request.CropY, request.CropScale);
        if (crop.IsFailure) return ErrorMapping.ToActionResult(crop.Error);

        var result = await personaManager.SetPersonaAvatarPhotoAsync(baulId, personaId, request.PhotoId, crop.Value);

        return result.ToActionResult();
    }

    [HttpPut("{baulId:guid}/personas/{personaId:guid}/role")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdatePersonaRole(BaulId baulId, PersonaId personaId, [FromBody] UpdateRoleRequest request)
    {
        var role = BaulRoleParser.Parse(request.Role);
        if (role.IsFailure) return ErrorMapping.ToActionResult(role.Error);

        var result = await personaManager.UpdatePersonaRoleAsync(baulId, personaId, role.Value);
        return result.ToActionResult();
    }

    [HttpDelete("{baulId:guid}/personas/{personaId:guid}")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> RemovePersona(BaulId baulId, PersonaId personaId)
    {
        var result = await personaManager.RemovePersonaAsync(baulId, personaId);
        return result.ToActionResult(Ok(new { success = true }));
    }

    [HttpGet("{baulId:guid}/personas/{personaId:guid}/photos")]
    [ProducesResponseType(typeof(IEnumerable<PhotoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPersonaPhotos(BaulId baulId, PersonaId personaId)
    {
        var result = await photoManager.GetByPersonaIdAsync(baulId, personaId);
        return result.ToActionResult();
    }

    [HttpGet("{baulId:guid}/removal-requests")]
    [ProducesResponseType(typeof(IEnumerable<RemovalRequestDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRemovalRequests(BaulId baulId)
    {
        var result = await removalRequestManager.GetRemovalRequestsAsync(baulId);
        return result.ToActionResult();
    }

    [HttpPost("{baulId:guid}/removal-requests")]
    [ProducesResponseType(typeof(RemovalRequestDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateRemovalRequest(BaulId baulId, [FromBody] CreateRemovalRequestRequest request)
    {
        var result = await removalRequestManager.CreateRemovalRequestAsync(baulId, request.PhotoId, request.Reason);
        return result.ToActionResult();
    }

    [HttpPost("{baulId:guid}/removal-requests/{requestId:guid}/approve")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> ApproveRemovalRequest(BaulId baulId, RemovalRequestId requestId)
    {
        var result = await removalRequestManager.ApproveRemovalRequestAsync(baulId, requestId);
        return result.ToActionResult(Ok(new { success = true }));
    }

    [HttpPost("{baulId:guid}/removal-requests/{requestId:guid}/reject")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> RejectRemovalRequest(BaulId baulId, RemovalRequestId requestId)
    {
        var result = await removalRequestManager.RejectRemovalRequestAsync(baulId, requestId);
        return result.ToActionResult(Ok(new { success = true }));
    }

    [HttpGet("{baulId:guid}/recuerdos")]
    [ProducesResponseType(typeof(IEnumerable<RecuerdoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecuerdos(BaulId baulId)
    {
        var result = await recuerdoManager.GetRecuerdosAsync(baulId);
        return result.ToActionResult();
    }

    [HttpPost("{baulId:guid}/recuerdos")]
    [ProducesResponseType(typeof(RecuerdoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateRecuerdo(BaulId baulId, [FromBody] CreateRecuerdoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var result = await recuerdoManager.CreateRecuerdoAsync(baulId, request.Text);
        return result.ToActionResult();
    }

    // New feed endpoints — additive, behind Features:BaulFeedEnabled (see BaulFeedManager).
    // GetRecuerdos above stays untouched so the frontend can keep using it while the toggle is
    // off, without any behavior change to that existing contract.
    [HttpGet("{baulId:guid}/feed")]
    [ProducesResponseType(typeof(FeedPageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFeed(BaulId baulId, [FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        var result = await baulFeedManager.GetFeedAsync(baulId, skip, take);
        return result.ToActionResult();
    }

    [HttpGet("{baulId:guid}/photo-batches/{batchId:guid}/photos")]
    [ProducesResponseType(typeof(IEnumerable<PhotoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPhotoBatchPhotos(BaulId baulId, Guid batchId)
    {
        var result = await baulFeedManager.GetBatchPhotosAsync(baulId, batchId);
        return result.ToActionResult();
    }
}
