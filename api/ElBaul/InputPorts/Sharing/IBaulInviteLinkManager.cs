using ElBaul.InputPorts.Personas;
using ElBaul.InputPorts.Sharing;
using ElBaul.OutputPorts.Shared;
using ElBaul.Shared;

namespace ElBaul.InputPorts.Sharing;
public interface IBaulInviteLinkManager
{
    Task<Result<BaulInviteLinkDto>> GetOrCreateAsync(BaulId baulId);
    Task<Result<BaulInviteLinkDto>> RegenerateAsync(BaulId baulId);
    Task<Result<BaulInviteLinkPreviewDto>> GetPreviewAsync(string token);
    Task<Result<IEnumerable<ClaimablePersonaDto>>> GetClaimablePersonasAsync(string token);
    Task<Result<PersonaDto>> AcceptAsync(string token, PersonaId? personaId = null);
}
