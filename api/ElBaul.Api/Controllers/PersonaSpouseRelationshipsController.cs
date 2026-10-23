using ElBaul.Api.Models;
using ElBaul.Core.Personas;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using ElBaul.Domain;
namespace ElBaul.Api.Controllers;

// Baúl-scoped, not persona-scoped: a relationship connects two personas, neither "owns" it — see
// PersonaRelationshipsController's doc comment, and IPersonaSpouseRelationshipManager.GetSpouseRelationshipsAsync's.
[Authorize]
[ApiController]
[Route("api/baules/{baulId:guid}/persona-spouse-relationships")]
public class PersonaSpouseRelationshipsController(IPersonaSpouseRelationshipManager personaSpouseRelationshipManager) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<PersonaSpouseRelationshipDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(BaulId baulId)
    {
        var result = await personaSpouseRelationshipManager.GetSpouseRelationshipsAsync(baulId);
        return result.ToActionResult();
    }

    [HttpPost]
    [ProducesResponseType(typeof(PersonaSpouseRelationshipDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Add(BaulId baulId, [FromBody] AddPersonaSpouseRelationshipRequest request)
    {
        var result = await personaSpouseRelationshipManager.AddSpouseRelationshipAsync(baulId, request.PersonaId1, request.PersonaId2);
        return result.ToActionResult();
    }

    [HttpDelete("{personaId1:guid}/{personaId2:guid}")]
    [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Remove(BaulId baulId, PersonaId personaId1, PersonaId personaId2)
    {
        var result = await personaSpouseRelationshipManager.RemoveSpouseRelationshipAsync(baulId, personaId1, personaId2);
        return result.ToActionResult(Ok(new { success = true }));
    }
}
