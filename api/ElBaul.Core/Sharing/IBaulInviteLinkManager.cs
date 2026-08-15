using ElBaul.Domain;
using ElBaul.Core.Personas;
using Ne2Studio.Common;

namespace ElBaul.Core.Sharing;
public interface IBaulInviteLinkManager
{
    Task<Result<BaulInviteLinkDto>> GetOrCreateAsync(BaulId baulId);
    Task<Result<BaulInviteLinkDto>> RegenerateAsync(BaulId baulId);
    Task<Result<BaulInviteLinkLandingDto>> GetLandingAsync(string token);
    Task<Result<BaulInviteLinkPreviewDto>> GetPreviewAsync(string token);
    Task<Result<IEnumerable<ClaimablePersonaDto>>> GetClaimablePersonasAsync(string token);
    Task<Result<PersonaDto>> AcceptAsync(string token, PersonaId? personaId = null);
}
