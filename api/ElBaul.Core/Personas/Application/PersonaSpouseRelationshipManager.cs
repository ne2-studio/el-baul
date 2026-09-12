using ElBaul.Core.Bauls;
using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Shared.Application;
using ElBaul.Core.Shared.OutputPorts;
using Microsoft.Extensions.Logging;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Core.Personas.Application;

// The "cónyuge" subdomain: a single symmetric edge per pair of personas, readable from either end
// (there is no derived Persona.Spouse property yet — callers go through GetSpouseRelationshipsAsync,
// same as PersonaRelationshipManager). El Baúl models monogamous families only, so — unlike
// PersonaRelationshipManager, which allows any number of children/parents per persona — this
// manager also rejects a second spouse relationship for either persona.
public class PersonaSpouseRelationshipManager(
    ILogger<PersonaSpouseRelationshipManager> logger,
    IPersonaSpouseRelationshipRepository relationshipRepository,
    IPersonaRepository personaRepository,
    IClock clock,
    ICurrentUserProvider currentUserProvider,
    IBaulAuthorizer baulAccess) : IPersonaSpouseRelationshipManager
{
    public async Task<Result<IEnumerable<PersonaSpouseRelationshipDto>>> GetSpouseRelationshipsAsync(BaulId baulId)
    {
        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Persona spouse relationships list");
        if (auth.IsFailure) return Result.Failure<IEnumerable<PersonaSpouseRelationshipDto>>(auth.Error);

        var relationships = await relationshipRepository.GetByBaulIdAsync(baulId);
        return Result.Success(relationships.Select(ToDto));
    }

    public async Task<Result<PersonaSpouseRelationshipDto>> AddSpouseRelationshipAsync(BaulId baulId, PersonaId personaId1, PersonaId personaId2)
    {
        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Persona spouse relationship creation");
        if (auth.IsFailure) return Result.Failure<PersonaSpouseRelationshipDto>(auth.Error);

        if (personaId1 == personaId2)
        {
            logger.LogWarning("Persona spouse relationship creation rejected: a persona cannot be related to itself {PersonaId}", personaId1);
            return Result.Failure<PersonaSpouseRelationshipDto>(ApplicationError.Validation("A persona cannot be related to itself"));
        }

        var persona1Result = await EntityLookup.ResolveAsync(
            () => personaRepository.GetPersonaByIdAsync(personaId1),
            persona => persona.BaulId == baulId,
            logger,
            "Persona spouse relationship creation rejected: persona not found {BaulId} {PersonaId}",
            "Persona not found",
            baulId, personaId1);
        if (persona1Result.IsFailure) return Result.Failure<PersonaSpouseRelationshipDto>(persona1Result.Error);

        var persona2Result = await EntityLookup.ResolveAsync(
            () => personaRepository.GetPersonaByIdAsync(personaId2),
            persona => persona.BaulId == baulId,
            logger,
            "Persona spouse relationship creation rejected: persona not found {BaulId} {PersonaId}",
            "Persona not found",
            baulId, personaId2);
        if (persona2Result.IsFailure) return Result.Failure<PersonaSpouseRelationshipDto>(persona2Result.Error);

        var existing = await relationshipRepository.GetBetweenAsync(personaId1, personaId2);
        if (existing is not null)
        {
            logger.LogWarning(
                "Persona spouse relationship creation rejected: relationship already exists {PersonaId1} {PersonaId2}", personaId1, personaId2);
            return Result.Failure<PersonaSpouseRelationshipDto>(
                ApplicationError.Validation("A relationship already exists between these personas"));
        }

        // Monogamous families only: neither persona may already have a spouse.
        if (await relationshipRepository.GetForPersonaAsync(personaId1) is not null ||
            await relationshipRepository.GetForPersonaAsync(personaId2) is not null)
        {
            logger.LogWarning(
                "Persona spouse relationship creation rejected: a persona already has a spouse {PersonaId1} {PersonaId2}", personaId1, personaId2);
            return Result.Failure<PersonaSpouseRelationshipDto>(
                ApplicationError.Validation("This persona already has a spouse"));
        }

        var relationship = new PersonaSpouseRelationship(personaId1, personaId2, baulId, clock.UtcNow());
        await relationshipRepository.AddAsync(relationship);
        logger.LogInformation("Persona spouse relationship created {PersonaId1} {PersonaId2}", personaId1, personaId2);

        return Result.Success(ToDto(relationship));
    }

    public async Task<Result> RemoveSpouseRelationshipAsync(BaulId baulId, PersonaId personaId1, PersonaId personaId2)
    {
        var userId = currentUserProvider.GetUserId();
        var auth = await baulAccess.AuthorizeAsync(baulId, userId, AccessLevel.Member, "Persona spouse relationship removal");
        if (auth.IsFailure) return Result.Failure(auth.Error);

        var existing = await relationshipRepository.GetBetweenAsync(personaId1, personaId2);
        if (existing is null || existing.BaulId != baulId)
        {
            logger.LogWarning("Persona spouse relationship removal rejected: relationship not found {PersonaId1} {PersonaId2}", personaId1, personaId2);
            return Result.Failure(ApplicationError.NotFound("Relationship not found"));
        }

        await relationshipRepository.RemoveAsync(existing.PersonaId1, existing.PersonaId2);
        logger.LogInformation("Persona spouse relationship removed {PersonaId1} {PersonaId2}", existing.PersonaId1, existing.PersonaId2);
        return Result.Success();
    }

    private static PersonaSpouseRelationshipDto ToDto(PersonaSpouseRelationship relationship) =>
        new(relationship.PersonaId1.Value.ToString(), relationship.PersonaId2.Value.ToString());
}
