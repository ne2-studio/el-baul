using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface IPersonaManager
{
    Task<Result<BaulPreviewDto>> GetInvitePreviewAsync(Guid personaId);
    Task<Result<PersonaDto>> AcceptPersonalInviteAsync(Guid personaId);

    Task<Result<IEnumerable<PersonaDto>>> GetPersonasAsync(Guid baulId);
    Task<Result<PersonaDto>> GetPersonaAsync(Guid baulId, Guid personaId);
    Task<Result<PersonaDto>> CreatePersonaAsync(Guid baulId, string nickname);
    Task<Result<PersonaDto>> UpdatePersonaAsync(Guid baulId, Guid personaId, string? name, string nickname);
    Task<Result<PersonaDto>> UpdatePersonaAvatarAsync(
        Guid baulId, Guid personaId, Stream content, string fileName, string contentType);
    Task<Result<PersonaDto>> UpdatePersonaRoleAsync(Guid baulId, Guid personaId, string role);
    Task<Result> RemovePersonaAsync(Guid baulId, Guid personaId);
}
