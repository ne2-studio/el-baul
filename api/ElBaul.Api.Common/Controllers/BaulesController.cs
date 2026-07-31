using ElBaul.Api.Models;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/baules")]
public class BaulesController(
    IBaulManager baulManager, IPersonaManager personaManager, IRemovalRequestManager removalRequestManager,
    IPhotoManager photoManager, IRecuerdoManager recuerdoManager, IBaulInviteLinkManager baulInviteLinkManager)
    : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<BaulDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var result = await baulManager.GetAllForCurrentUserAsync();
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost]
    [ProducesResponseType(typeof(BaulDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Create([FromBody] CreateBaulRequest request)
    {
        var result = await baulManager.CreateAsync(request.Name, request.Description);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("{baulId:guid}")]
    [ProducesResponseType(typeof(BaulDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(Guid baulId)
    {
        var result = await baulManager.GetByIdAsync(new BaulId(baulId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("{baulId:guid}/cover")]
    [ProducesResponseType(typeof(BaulDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetCover(Guid baulId, [FromBody] SetBaulCoverRequest request)
    {
        if (!Guid.TryParse(request.PhotoId, out var photoId))
            return BadRequest(new { error = $"'{request.PhotoId}' is not a valid photo id." });

        var result = await baulManager.SetCoverAsync(new BaulId(baulId), new PhotoId(photoId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("{baulId:guid}")]
    [ProducesResponseType(typeof(BaulDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid baulId, [FromBody] UpdateBaulRequest request)
    {
        var result = await baulManager.UpdateAsync(new BaulId(baulId), request.Name, request.Description);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [AllowAnonymous]
    [EnableRateLimiting("PublicLimiter")]
    [HttpGet("/api/personas/{personaId:guid}/invite-preview")]
    [ProducesResponseType(typeof(BaulPreviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetInvitePreview(Guid personaId)
    {
        var result = await personaManager.GetInvitePreviewAsync(new PersonaId(personaId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("/api/personas/{personaId:guid}/accept-invite")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> AcceptPersonalInvite(Guid personaId)
    {
        var result = await personaManager.AcceptPersonalInviteAsync(new PersonaId(personaId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("{baulId:guid}/invite-link")]
    [ProducesResponseType(typeof(BaulInviteLinkDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetInviteLink(Guid baulId)
    {
        var result = await baulInviteLinkManager.GetOrCreateAsync(new BaulId(baulId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("{baulId:guid}/invite-link/regenerate")]
    [ProducesResponseType(typeof(BaulInviteLinkDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RegenerateInviteLink(Guid baulId)
    {
        var result = await baulInviteLinkManager.RegenerateAsync(new BaulId(baulId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("{baulId:guid}/personas")]
    [ProducesResponseType(typeof(IEnumerable<PersonaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPersonas(Guid baulId)
    {
        var result = await personaManager.GetPersonasAsync(new BaulId(baulId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("{baulId:guid}/personas")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreatePersona(Guid baulId, [FromBody] CreatePersonaRequest request)
    {
        var result = await personaManager.CreatePersonaAsync(new BaulId(baulId), request.Nickname);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("{baulId:guid}/personas/{personaId:guid}")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPersona(Guid baulId, Guid personaId)
    {
        var result = await personaManager.GetPersonaAsync(new BaulId(baulId), new PersonaId(personaId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("{baulId:guid}/personas/{personaId:guid}")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdatePersona(Guid baulId, Guid personaId, [FromBody] UpdatePersonaRequest request)
    {
        var result = await personaManager.UpdatePersonaAsync(
            new BaulId(baulId), new PersonaId(personaId), request.Name, request.Nickname);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("{baulId:guid}/personas/{personaId:guid}/biografia")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdatePersonaBiografia(Guid baulId, Guid personaId, [FromBody] UpdatePersonaBiografiaRequest request)
    {
        var result = await personaManager.UpdatePersonaBiografiaAsync(
            new BaulId(baulId), new PersonaId(personaId), request.Biografia);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("{baulId:guid}/personas/{personaId:guid}/avatar")]
    [RequestSizeLimit(5_000_000)]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadPersonaAvatar(
        Guid baulId, Guid personaId, [FromForm] UploadPersonaAvatarRequest request)
    {
        if (request.File is null || request.File.Length == 0)
            return BadRequest(new { error = "No file provided" });

        var crop = AvatarCrop.Create(request.CropX, request.CropY, request.CropScale);
        if (crop.IsFailure) return ErrorMapping.ToActionResult(crop.Error);

        if (!Guid.TryParse(request.ClientUploadId, out var clientUploadId))
            clientUploadId = Guid.NewGuid();

        await using var stream = request.File.OpenReadStream();
        var result = await personaManager.UpdatePersonaAvatarAsync(
            new BaulId(baulId), new PersonaId(personaId), stream, request.File.FileName, request.File.ContentType,
            crop.Value, new ClientUploadId(clientUploadId));

        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("{baulId:guid}/personas/{personaId:guid}/avatar")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetPersonaAvatarPhoto(
        Guid baulId, Guid personaId, [FromBody] SetPersonaAvatarPhotoRequest request)
    {
        if (!Guid.TryParse(request.PhotoId, out var photoId))
            return BadRequest(new { error = $"'{request.PhotoId}' is not a valid photo id." });

        var crop = AvatarCrop.Create(request.CropX, request.CropY, request.CropScale);
        if (crop.IsFailure) return ErrorMapping.ToActionResult(crop.Error);

        var result = await personaManager.SetPersonaAvatarPhotoAsync(
            new BaulId(baulId), new PersonaId(personaId), new PhotoId(photoId), crop.Value);

        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPut("{baulId:guid}/personas/{personaId:guid}/role")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdatePersonaRole(Guid baulId, Guid personaId, [FromBody] UpdateRoleRequest request)
    {
        if (!BaulRoleParser.TryParse(request.Role, out var role))
            return BadRequest(new { error = "Invalid role" });

        var result = await personaManager.UpdatePersonaRoleAsync(new BaulId(baulId), new PersonaId(personaId), role);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpDelete("{baulId:guid}/personas/{personaId:guid}")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> RemovePersona(Guid baulId, Guid personaId)
    {
        var result = await personaManager.RemovePersonaAsync(new BaulId(baulId), new PersonaId(personaId));
        return result.IsSuccess ? Ok(new { success = true }) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("{baulId:guid}/personas/{personaId:guid}/photos")]
    [ProducesResponseType(typeof(IEnumerable<PhotoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPersonaPhotos(Guid baulId, Guid personaId)
    {
        var result = await photoManager.GetByPersonaIdAsync(new BaulId(baulId), new PersonaId(personaId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("{baulId:guid}/removal-requests")]
    [ProducesResponseType(typeof(IEnumerable<RemovalRequestDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRemovalRequests(Guid baulId)
    {
        var result = await removalRequestManager.GetRemovalRequestsAsync(new BaulId(baulId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("{baulId:guid}/removal-requests")]
    [ProducesResponseType(typeof(RemovalRequestDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateRemovalRequest(Guid baulId, [FromBody] CreateRemovalRequestRequest request)
    {
        if (!Guid.TryParse(request.PhotoId, out var photoId))
            return BadRequest(new { error = $"'{request.PhotoId}' is not a valid photo id." });

        var result = await removalRequestManager.CreateRemovalRequestAsync(new BaulId(baulId), new PhotoId(photoId), request.Reason);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("{baulId:guid}/removal-requests/{requestId:guid}/approve")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> ApproveRemovalRequest(Guid baulId, Guid requestId)
    {
        var result = await removalRequestManager.ApproveRemovalRequestAsync(new BaulId(baulId), new RemovalRequestId(requestId));
        return result.IsSuccess ? Ok(new { success = true }) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("{baulId:guid}/removal-requests/{requestId:guid}/reject")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> RejectRemovalRequest(Guid baulId, Guid requestId)
    {
        var result = await removalRequestManager.RejectRemovalRequestAsync(new BaulId(baulId), new RemovalRequestId(requestId));
        return result.IsSuccess ? Ok(new { success = true }) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpGet("{baulId:guid}/recuerdos")]
    [ProducesResponseType(typeof(IEnumerable<RecuerdoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecuerdos(Guid baulId)
    {
        var result = await recuerdoManager.GetRecuerdosAsync(new BaulId(baulId));
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }

    [HttpPost("{baulId:guid}/recuerdos")]
    [ProducesResponseType(typeof(RecuerdoDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateRecuerdo(Guid baulId, [FromBody] CreateRecuerdoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { error = "Text is required" });

        var result = await recuerdoManager.CreateRecuerdoAsync(new BaulId(baulId), request.Text);
        return result.IsSuccess ? Ok(result.Value) : ErrorMapping.ToActionResult(result.Error);
    }
}
