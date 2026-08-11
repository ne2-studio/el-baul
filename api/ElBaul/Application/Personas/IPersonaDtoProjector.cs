using ElBaul.Application.Personas;
using ElBaul.InputPorts.Personas;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Users;

using ElBaul.Domain;
namespace ElBaul.Application.Personas;
public interface IPersonaDtoProjector
{
    // custodioId decides the wire "custodio" role string (Custodio isn't a stored BaulRole
    // value — see BaulRole.cs) — every caller already has it on hand via BaulAccess.Baul/Baul.
    Task<PersonaDto> ProjectAsync(Persona persona, User? user, bool canEdit, UserId custodioId);

    /// <summary>Batch-friendly counterpart for lists — one avatar-photo lookup
    /// (IPhotoRepository.GetByIdsAsync) for the whole list instead of one per persona (the N+1
    /// a ProjectAsync-in-a-loop caller used to run, mirroring AuthorInfoProjector.GetManyAsync's
    /// same trade-off for recuerdo authorship). ProjectAsync stays the right call for
    /// single-persona paths (create/update/accept-invite).</summary>
    Task<IReadOnlyList<PersonaDto>> ProjectManyAsync(IEnumerable<(Persona Persona, User? User, bool CanEdit)> items, UserId custodioId);
}
