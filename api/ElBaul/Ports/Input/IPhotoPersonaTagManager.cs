using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface IPhotoPersonaTagManager
{
    Task<Result<IEnumerable<TaggedPersonaDto>>> GetTaggedPersonasAsync(Guid photoId);
    Task<Result<IEnumerable<TaggedPersonaDto>>> SetTaggedPersonasAsync(Guid photoId, IEnumerable<Guid> personaIds);

    /// <summary>Adds (not replaces) the given personas to every listed photo's existing tag
    /// set — the multi-select "etiquetar personas" batch action, as opposed to
    /// SetTaggedPersonasAsync's replace-all semantics from the single-photo viewer.</summary>
    Task<Result<IEnumerable<string>>> AddTaggedPersonasBatchAsync(Guid baulId, IEnumerable<Guid> photoIds, IEnumerable<Guid> personaIds);
}
