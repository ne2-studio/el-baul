using ElBaul.Api.Models;
using ElBaul.Api.Scope;
using ElBaul.Core.Personas;
using ElBaul.Core.Sharing;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using ElBaul.Domain;
namespace ElBaul.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/baules/{baulId:guid}/personas")]
public class PersonasController(
    IPersonaManager personaManager, IPersonaInviteManager personaInviteManager, PersonaScopeAggregator personaScopeAggregator)
    : ControllerBase
{
    // Aggregates everything PersonaDetailRoute/PersonaPhotoViewerRoute need into one request —
    // see BaulScopeAggregator's doc comment (same rationale, no async-flag race here, just fewer
    // round-trips on a deep link/refresh).
    [HttpGet("{personaId:guid}/scope")]
    [ProducesResponseType(typeof(PersonaScopeDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetScope(BaulId baulId, PersonaId personaId)
    {
        var result = await personaScopeAggregator.GetScopeAsync(baulId, personaId);
        return result.ToActionResult();
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<PersonaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(BaulId baulId)
    {
        var result = await personaManager.GetPersonasAsync(baulId);
        return result.ToActionResult();
    }

    [HttpPost]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Create(BaulId baulId, [FromBody] CreatePersonaRequest request)
    {
        var result = await personaManager.CreatePersonaAsync(baulId, request.Nickname);
        return result.ToActionResult();
    }

    [HttpGet("{personaId:guid}")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(BaulId baulId, PersonaId personaId)
    {
        var result = await personaManager.GetPersonaAsync(baulId, personaId);
        return result.ToActionResult();
    }

    [HttpPut("{personaId:guid}")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(BaulId baulId, PersonaId personaId, [FromBody] UpdatePersonaRequest request)
    {
        var result = await personaManager.UpdatePersonaAsync(baulId, personaId, request.Name, request.Nickname);
        return result.ToActionResult();
    }

    [HttpPut("{personaId:guid}/biografia")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateBiografia(BaulId baulId, PersonaId personaId, [FromBody] UpdatePersonaBiografiaRequest request)
    {
        var result = await personaManager.UpdatePersonaBiografiaAsync(baulId, personaId, request.Biografia);
        return result.ToActionResult();
    }

    [HttpPost("{personaId:guid}/avatar")]
    [RequestSizeLimit(5_000_000)]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadAvatar(
        BaulId baulId, PersonaId personaId, [FromForm] UploadPersonaAvatarRequest request)
    {
        if (request.File is null || request.File.Length == 0)
            return BadRequest(new { error = "No file provided" });

        var crop = ImageCrop.Create(request.CropX, request.CropY, request.CropScale);
        if (crop.IsFailure) return ErrorMapping.ToActionResult(crop.Error);

        // A missing/invalid client-generated idempotency token falls back to a fresh one rather
        // than failing the request — unlike every other id on this boundary, there is no wrong
        // answer to recover from here, so this deliberately isn't ClientUploadId.Parse.
        if (!Guid.TryParse(request.ClientUploadId, out var clientUploadId))
            clientUploadId = Guid.NewGuid();

        await using var stream = request.File.OpenReadStream();
        var result = await personaManager.UpdatePersonaAvatarAsync(
            baulId, personaId, stream, crop.Value, new ClientUploadId(clientUploadId));

        return result.ToActionResult();
    }

    [HttpPut("{personaId:guid}/avatar")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetAvatarPhoto(
        BaulId baulId, PersonaId personaId, [FromBody] SetPersonaAvatarPhotoRequest request)
    {
        var crop = ImageCrop.Create(request.CropX, request.CropY, request.CropScale);
        if (crop.IsFailure) return ErrorMapping.ToActionResult(crop.Error);

        var result = await personaManager.SetPersonaAvatarPhotoAsync(baulId, personaId, request.PhotoId, crop.Value);

        return result.ToActionResult();
    }

    [HttpPut("{personaId:guid}/role")]
    [ProducesResponseType(typeof(PersonaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateRole(BaulId baulId, PersonaId personaId, [FromBody] UpdateRoleRequest request)
    {
        var role = BaulRoleParser.Parse(request.Role);
        if (role.IsFailure) return ErrorMapping.ToActionResult(role.Error);

        var result = await personaManager.UpdatePersonaRoleAsync(baulId, personaId, role.Value);
        return result.ToActionResult();
    }

    [HttpDelete("{personaId:guid}")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Remove(BaulId baulId, PersonaId personaId)
    {
        var result = await personaManager.RemovePersonaAsync(baulId, personaId);
        return result.ToActionResult(Ok(new { success = true }));
    }

    // "Invitar" on the "Invitar a la familia" page — issues this persona's invite token the
    // first time, re-shares the same one on later taps while it stays Pending. See
    // IPersonaInviteManager.InviteAsync.
    [HttpPost("{personaId:guid}/invite")]
    [ProducesResponseType(typeof(PersonaInviteDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Invite(BaulId baulId, PersonaId personaId)
    {
        var result = await personaInviteManager.InviteAsync(baulId, personaId);
        return result.ToActionResult();
    }
}
