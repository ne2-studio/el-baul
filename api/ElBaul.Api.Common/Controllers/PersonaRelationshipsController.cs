using ElBaul.Api.Models;
using ElBaul.Core.Personas;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using ElBaul.Domain;
namespace ElBaul.Api.Controllers;

// Baúl-scoped, not persona-scoped: a relationship connects two personas, neither "owns" it, and
// the frontend already holds every persona of the baúl in one list (same shape GetAll returns
// on PersonasController) — see IPersonaRelationshipManager.GetRelationshipsAsync's doc comment.
[Authorize]
[ApiController]
[Route("api/baules/{baulId:guid}/persona-relationships")]
public class PersonaRelationshipsController(IPersonaRelationshipManager personaRelationshipManager) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<PersonaRelationshipDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(BaulId baulId)
    {
        var result = await personaRelationshipManager.GetRelationshipsAsync(baulId);
        return result.ToActionResult();
    }

    [HttpPost]
    [ProducesResponseType(typeof(PersonaRelationshipDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Add(BaulId baulId, [FromBody] AddPersonaRelationshipRequest request)
    {
        var result = await personaRelationshipManager.AddRelationshipAsync(baulId, request.ParentId, request.ChildId);
        return result.ToActionResult();
    }

    [HttpDelete("{parentId:guid}/{childId:guid}")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Remove(BaulId baulId, PersonaId parentId, PersonaId childId)
    {
        var result = await personaRelationshipManager.RemoveRelationshipAsync(baulId, parentId, childId);
        return result.ToActionResult(Ok(new { success = true }));
    }
}
