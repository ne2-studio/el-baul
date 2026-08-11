using ElBaul.InputPorts.Personas;
using ElBaul.InputPorts.Photos;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using ElBaul.Shared;

namespace ElBaul.InputPorts.Photos;
public interface IPhotoPersonaTagManager
{
    Task<Result<IEnumerable<TaggedPersonaDto>>> GetTaggedPersonasAsync(PhotoId photoId);
    Task<Result<IEnumerable<TaggedPersonaDto>>> SetTaggedPersonasAsync(PhotoId photoId, IEnumerable<PersonaId> personaIds);

    /// <summary>Adds (not replaces) the given personas to every listed photo's existing tag
    /// set — the multi-select "etiquetar personas" batch action, as opposed to
    /// SetTaggedPersonasAsync's replace-all semantics from the single-photo viewer.</summary>
    Task<Result<IEnumerable<string>>> AddTaggedPersonasBatchAsync(BaulId baulId, IEnumerable<PhotoId> photoIds, IEnumerable<PersonaId> personaIds);
}
