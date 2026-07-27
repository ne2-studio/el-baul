using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;

namespace ElBaul.Ports.Input;

public interface IPersonaManager
{
    Task<Result<BaulPreviewDto>> GetInvitePreviewAsync(PersonaId personaId);
    Task<Result<PersonaDto>> AcceptPersonalInviteAsync(PersonaId personaId);

    Task<Result<IEnumerable<PersonaDto>>> GetPersonasAsync(BaulId baulId);
    Task<Result<PersonaDto>> GetPersonaAsync(BaulId baulId, PersonaId personaId);
    Task<Result<PersonaDto>> CreatePersonaAsync(BaulId baulId, string nickname);
    Task<Result<PersonaDto>> UpdatePersonaAsync(BaulId baulId, PersonaId personaId, string? name, string nickname, string? biografia);
    Task<Result<PersonaDto>> UpdatePersonaAvatarAsync(
        BaulId baulId, PersonaId personaId, Stream content, string fileName, string contentType);
    Task<Result<PersonaDto>> UpdatePersonaRoleAsync(BaulId baulId, PersonaId personaId, BaulRole role);
    Task<Result> RemovePersonaAsync(BaulId baulId, PersonaId personaId);
}
