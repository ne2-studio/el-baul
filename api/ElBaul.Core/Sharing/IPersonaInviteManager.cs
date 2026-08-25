using ElBaul.Domain;
using ElBaul.Core.Personas;
using Ne2Studio.Common;

namespace ElBaul.Core.Sharing;
public interface IPersonaInviteManager
{
    /// <summary>Admin-only. Lazily issues this persona's invite token the first time it's
    /// called, and re-shares the same token/url on every later call while the persona stays
    /// Pending — see Persona.IssueInviteToken.</summary>
    Task<Result<PersonaInviteDto>> InviteAsync(BaulId baulId, PersonaId personaId);

    Task<Result<PersonaInviteLandingDto>> GetLandingAsync(string token);
    Task<Result<PersonaInvitePreviewDto>> GetPreviewAsync(string token);

    /// <summary>Resolves the token directly to its one target persona — no "who are you"
    /// step, unlike the old global invite link.</summary>
    Task<Result<PersonaDto>> AcceptAsync(string token);
}
