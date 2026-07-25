namespace ElBaul.Ports.Output;

public interface IPhotoPersonaTagRepository
{
    Task<IEnumerable<PersonaId>> GetPersonaIdsByPhotoIdAsync(PhotoId photoId);
    Task<IEnumerable<PhotoId>> GetPhotoIdsByPersonaIdAsync(PersonaId personaId);

    /// <summary>Replaces the full tag set for a photo (delete-then-insert) — matches the
    /// tagging UI, which always saves the complete selected set rather than adding/removing
    /// one persona at a time.</summary>
    Task SetTagsAsync(PhotoId photoId, BaulId baulId, IEnumerable<PersonaId> personaIds, DateTime now);

    /// <summary>Used by the admin hard-delete flow. Both FKs on this table are Restrict (see
    /// PhotoPersonaTagConfiguration), so this must run before Photos/Personas are deleted.</summary>
    Task DeleteByBaulIdAsync(BaulId baulId);

    /// <summary>Used when a Persona is removed (a real row delete, unlike Photo's soft-delete) —
    /// otherwise the Restrict FK to Persona would reject the delete against real Postgres.</summary>
    Task DeleteByPersonaIdAsync(PersonaId personaId);
}
