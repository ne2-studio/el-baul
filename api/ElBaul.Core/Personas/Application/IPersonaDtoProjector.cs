using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Users.OutputPorts;

using ElBaul.Domain;
namespace ElBaul.Core.Personas.Application;
public interface IPersonaDtoProjector
{
    // custodioId decides the wire "custodio" role string (Custodio isn't a stored BaulRole
    // value — see BaulRole.cs) — every caller already has it on hand via BaulAccess.Baul/Baul.
    Task<PersonaDto> ProjectAsync(Persona persona, bool canEdit, UserId custodioId);

    /// <summary>Fast path for callers that already resolved the linked User for another
    /// reason. Pass null deliberately for projection contexts that must not disclose account
    /// data, such as public invite previews.</summary>
    Task<PersonaDto> ProjectWithResolvedUserAsync(Persona persona, User? user, bool canEdit, UserId custodioId);

    /// <summary>Batch-friendly counterpart for lists — one avatar-photo lookup
    /// (IPhotoRepository.GetByIdsAsync) for the whole list instead of one per persona (the N+1
    /// a ProjectAsync-in-a-loop caller used to run, mirroring AuthorInfoProjector.GetManyAsync's
    /// same trade-off for recuerdo authorship). ProjectAsync stays the right call for
    /// single-persona paths (create/update/accept-invite).</summary>
    Task<IReadOnlyList<PersonaDto>> ProjectManyAsync(IEnumerable<(Persona Persona, User? User, bool CanEdit)> items, UserId custodioId);
}
