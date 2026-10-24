using ElBaul.Api.Models;
using ElBaul.Core.Personas;
using ElBaul.Core.Photos;
using ElBaul.Core.Recuerdos;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Api.Scope;

// See BaulScopeAggregator's doc comment for why this lives here instead of in ElBaul.Core.
public class PersonaScopeAggregator(
    IPersonaManager personaManager,
    IPhotoReadManager photoReadManager,
    IRecuerdoManager recuerdoManager,
    IPersonaRelationshipManager personaRelationshipManager,
    IPersonaSpouseRelationshipManager personaSpouseRelationshipManager)
{
    public async Task<Result<PersonaScopeDto>> GetScopeAsync(BaulId baulId, PersonaId personaId)
    {
        // Awaited sequentially, not fanned out with Task.WhenAll: all four managers share the
        // same request-scoped DbContext, and EF Core's DbContext isn't safe for concurrent use by
        // multiple in-flight operations (it throws InvalidOperationException when two do).
        var personasResult = await personaManager.GetPersonasAsync(baulId);
        if (personasResult.IsFailure) return Result.Failure<PersonaScopeDto>(personasResult.Error);

        var photosResult = await photoReadManager.GetByPersonaIdAsync(baulId, personaId);
        if (photosResult.IsFailure) return Result.Failure<PersonaScopeDto>(photosResult.Error);

        var recuerdosResult = await recuerdoManager.GetRecuerdosAsync(baulId);
        if (recuerdosResult.IsFailure) return Result.Failure<PersonaScopeDto>(recuerdosResult.Error);

        // Every relationship in the baúl, not just this persona's — the ficha's "Familia"
        // section only needs this persona's, but PersonasTab-style navigation to a relative's
        // own ficha benefits from arriving with the full graph already cached client-side too.
        var relationshipsResult = await personaRelationshipManager.GetRelationshipsAsync(baulId);
        if (relationshipsResult.IsFailure) return Result.Failure<PersonaScopeDto>(relationshipsResult.Error);

        var spouseRelationshipsResult = await personaSpouseRelationshipManager.GetSpouseRelationshipsAsync(baulId);
        if (spouseRelationshipsResult.IsFailure) return Result.Failure<PersonaScopeDto>(spouseRelationshipsResult.Error);

        return Result.Success(new PersonaScopeDto(
            personasResult.Value, photosResult.Value, recuerdosResult.Value, relationshipsResult.Value, spouseRelationshipsResult.Value));
    }
}
