using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.Core.Personas;
public interface IPersonaSpouseRelationshipManager
{
    /// <summary>Every spouse relationship in the baúl — not scoped to one persona, same shape as
    /// IPersonaRelationshipManager.GetRelationshipsAsync, so the frontend can derive any persona's
    /// spouse client-side without a round trip per persona.</summary>
    Task<Result<IEnumerable<PersonaSpouseRelationshipDto>>> GetSpouseRelationshipsAsync(BaulId baulId);

    /// <summary>Creates the single symmetric edge — callable with the two ids in either order.
    /// Fails if personaId1 == personaId2, either persona isn't found in this baúl, a relationship
    /// already exists between the two (in either order), or either persona already has a spouse
    /// (El Baúl models monogamous families only: at most one spouse per persona).</summary>
    Task<Result<PersonaSpouseRelationshipDto>> AddSpouseRelationshipAsync(BaulId baulId, PersonaId personaId1, PersonaId personaId2);

    /// <summary>Deletes the one relationship between these two personas — there is no "owned by
    /// personaId1" vs "owned by personaId2", so this is the single deletion path regardless of
    /// which end the user acted from.</summary>
    Task<Result> RemoveSpouseRelationshipAsync(BaulId baulId, PersonaId personaId1, PersonaId personaId2);
}
