using ElBaul.Core.Bauls;
using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Shared.Application;
using ElBaul.Core.Shared.OutputPorts;
using Microsoft.Extensions.Logging;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Core.Personas.Application;

// The whole "familia" subdomain from the feature spec: a single Parent->Child edge per pair of
// personas, readable from either end (Persona.Parents/Children are derived, never stored — see
// PersonaRelationship's doc comment). Kept deliberately thin: no cycle detection, no derived
// sibling/spouse inference — see the feature's "out of scope for v1" list.
public class PersonaRelationshipManager(
    ILogger<PersonaRelationshipManager> logger,
    IPersonaRelationshipRepository relationshipRepository,
    IPersonaRepository personaRepository,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    IBaulAuthorizer baulAccess) : IPersonaRelationshipManager
{
    public async Task<Result<IEnumerable<PersonaRelationshipDto>>> GetRelationshipsAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Persona relationships list");
        if (auth.IsFailure) return Result.Failure<IEnumerable<PersonaRelationshipDto>>(auth.Error);

        var relationships = await relationshipRepository.GetByBaulIdAsync(baulId);
        return Result.Success(relationships.Select(ToDto));
    }

    public async Task<Result<PersonaRelationshipDto>> AddRelationshipAsync(BaulId baulId, PersonaId parentId, PersonaId childId)
    {
        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Persona relationship creation");
        if (auth.IsFailure) return Result.Failure<PersonaRelationshipDto>(auth.Error);

        if (parentId == childId)
        {
            logger.LogWarning("Persona relationship creation rejected: a persona cannot be related to itself {PersonaId}", parentId);
            return Result.Failure<PersonaRelationshipDto>(ApplicationError.Validation("A persona cannot be related to itself"));
        }

        var parentResult = await EntityLookup.ResolveAsync(
            () => personaRepository.GetPersonaByIdAsync(parentId),
            persona => persona.BaulId == baulId,
            logger,
            "Persona relationship creation rejected: parent persona not found {BaulId} {PersonaId}",
            "Persona not found",
            baulId, parentId);
        if (parentResult.IsFailure) return Result.Failure<PersonaRelationshipDto>(parentResult.Error);

        var childResult = await EntityLookup.ResolveAsync(
            () => personaRepository.GetPersonaByIdAsync(childId),
            persona => persona.BaulId == baulId,
            logger,
            "Persona relationship creation rejected: child persona not found {BaulId} {PersonaId}",
            "Persona not found",
            baulId, childId);
        if (childResult.IsFailure) return Result.Failure<PersonaRelationshipDto>(childResult.Error);

        var existing = await relationshipRepository.GetBetweenAsync(parentId, childId);
        if (existing is not null)
        {
            logger.LogWarning(
                "Persona relationship creation rejected: relationship already exists {ParentId} {ChildId}", parentId, childId);
            return Result.Failure<PersonaRelationshipDto>(
                ApplicationError.Validation("A relationship already exists between these personas"));
        }

        var relationship = new PersonaRelationship(parentId, childId, baulId, clock.UtcNow());
        await relationshipRepository.AddAsync(relationship);
        logger.LogInformation("Persona relationship created {ParentId} {ChildId}", parentId, childId);

        return Result.Success(ToDto(relationship));
    }

    public async Task<Result> RemoveRelationshipAsync(BaulId baulId, PersonaId parentId, PersonaId childId)
    {
        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Persona relationship removal");
        if (auth.IsFailure) return Result.Failure(auth.Error);

        var existing = await relationshipRepository.GetBetweenAsync(parentId, childId);
        if (existing is null || existing.BaulId != baulId)
        {
            logger.LogWarning("Persona relationship removal rejected: relationship not found {ParentId} {ChildId}", parentId, childId);
            return Result.Failure(ApplicationError.NotFound("Relationship not found"));
        }

        await relationshipRepository.RemoveAsync(existing.ParentId, existing.ChildId);
        logger.LogInformation("Persona relationship removed {ParentId} {ChildId}", existing.ParentId, existing.ChildId);
        return Result.Success();
    }

    private static PersonaRelationshipDto ToDto(PersonaRelationship relationship) =>
        new(relationship.ParentId.Value.ToString(), relationship.ChildId.Value.ToString());
}
