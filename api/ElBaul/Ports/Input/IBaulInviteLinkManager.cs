using ElBaul.Ports.Output;
using ElBaul.Ports.Shared;

namespace ElBaul.Ports.Input;

public interface IBaulInviteLinkManager
{
    Task<Result<BaulInviteLinkDto>> GetOrCreateAsync(BaulId baulId);
    Task<Result<BaulInviteLinkDto>> RegenerateAsync(BaulId baulId);
    Task<Result<BaulInviteLinkPreviewDto>> GetPreviewAsync(string token);
    Task<Result<IEnumerable<ClaimablePersonaDto>>> GetClaimablePersonasAsync(string token);
    Task<Result<PersonaDto>> AcceptAsync(string token, PersonaId? personaId = null);
}
