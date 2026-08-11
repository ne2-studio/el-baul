using ElBaul.Application.Personas;
using ElBaul.InputPorts.Personas;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Users;

namespace ElBaul.Application.Personas;
public interface IPersonaDtoProjector
{
    Task<PersonaDto> ProjectAsync(Persona persona, User? user, bool canEdit);

    /// <summary>Batch-friendly counterpart for lists — one avatar-photo lookup
    /// (IPhotoRepository.GetByIdsAsync) for the whole list instead of one per persona (the N+1
    /// a ProjectAsync-in-a-loop caller used to run, mirroring AuthorInfoProjector.GetManyAsync's
    /// same trade-off for recuerdo authorship). ProjectAsync stays the right call for
    /// single-persona paths (create/update/accept-invite).</summary>
    Task<IReadOnlyList<PersonaDto>> ProjectManyAsync(IEnumerable<(Persona Persona, User? User, bool CanEdit)> items);
}
