using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.Core.Personas;
public interface IPersonaRelationshipManager
{
    /// <summary>Every parent/child relationship in the baúl — not scoped to one persona, same
    /// shape as IPersonaManager.GetPersonasAsync, so the frontend can derive any persona's
    /// parents/children client-side without a round trip per persona.</summary>
    Task<Result<IEnumerable<PersonaRelationshipDto>>> GetRelationshipsAsync(BaulId baulId);

    /// <summary>Creates the single directed Parent->Child edge — callable from either end (the
    /// caller decides which of the two ids is the parent before calling this), the inverse
    /// ("child of") is never stored separately. Fails if parentId == childId, either persona
    /// isn't found in this baúl, or a relationship already exists between the two (in either
    /// direction).</summary>
    Task<Result<PersonaRelationshipDto>> AddRelationshipAsync(BaulId baulId, PersonaId parentId, PersonaId childId);

    /// <summary>Deletes the one relationship between these two personas — there is no
    /// "relationship owned by parentId" vs "owned by childId", so this is the single deletion
    /// path regardless of which end the user acted from.</summary>
    Task<Result> RemoveRelationshipAsync(BaulId baulId, PersonaId parentId, PersonaId childId);
}
