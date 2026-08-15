using ElBaul.Domain;
namespace ElBaul.OutputPorts.Personas;
public interface IPhotoPersonaTagRepository
{
    Task<IEnumerable<PersonaId>> GetPersonaIdsByPhotoIdAsync(PhotoId photoId);
    Task<IEnumerable<PhotoId>> GetPhotoIdsByPersonaIdAsync(PersonaId personaId);

    /// <summary>Batched counterpart to GetPersonaIdsByPhotoIdAsync — existing tags for several
    /// photos in one query, keyed by PhotoId. A photo with no tags is simply absent from the
    /// result rather than mapped to an empty list.</summary>
    Task<IReadOnlyDictionary<PhotoId, IReadOnlyList<PersonaId>>> GetPersonaIdsByPhotoIdsAsync(IEnumerable<PhotoId> photoIds);

    /// <summary>Replaces the full tag set for a photo (delete-then-insert) — matches the
    /// tagging UI, which always saves the complete selected set rather than adding/removing
    /// one persona at a time.</summary>
    Task SetTagsAsync(PhotoId photoId, BaulId baulId, IEnumerable<PersonaId> personaIds, DateTime now);

    /// <summary>Batched counterpart to SetTagsAsync — one delete + one insert for every photo in
    /// tagsByPhotoId instead of one of each per photo. Same "replace the full set" contract per
    /// photo; tagsByPhotoId's value is that photo's complete resulting tag set, not a delta.</summary>
    Task SetTagsForManyAsync(BaulId baulId, IReadOnlyDictionary<PhotoId, IReadOnlyList<PersonaId>> tagsByPhotoId, DateTime now);

    /// <summary>Used by the admin hard-delete flow. Both FKs on this table are Restrict (see
    /// PhotoPersonaTagConfiguration), so this must run before Photos/Personas are deleted.</summary>
    Task DeleteByBaulIdAsync(BaulId baulId);

    /// <summary>Used when a Persona is removed (a real row delete, unlike Photo's soft-delete) —
    /// otherwise the Restrict FK to Persona would reject the delete against real Postgres.</summary>
    Task DeleteByPersonaIdAsync(PersonaId personaId);
}
