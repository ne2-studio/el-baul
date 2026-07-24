using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface IBaulManager
{
    Task<Result<IEnumerable<BaulDto>>> GetAllForCurrentUserAsync();
    Task<Result<BaulDto>> CreateAsync(string name, string? description);
    Task<Result<BaulDto>> GetByIdAsync(Guid baulId);
    Task<Result<BaulPreviewDto>> GetInvitePreviewAsync(Guid personaId);
    Task<Result<PersonaDto>> AcceptPersonalInviteAsync(Guid personaId);
    Task<Result<BaulDto>> SetCoverAsync(Guid baulId, Guid photoId);
    Task<Result<BaulDto>> UpdateAsync(Guid baulId, string name, string? description);

    Task<Result<IEnumerable<PersonaDto>>> GetPersonasAsync(Guid baulId);
    Task<Result<PersonaDto>> GetPersonaAsync(Guid baulId, Guid personaId);
    Task<Result<PersonaDto>> CreatePersonaAsync(Guid baulId, string nickname);
    Task<Result<PersonaDto>> UpdatePersonaAsync(Guid baulId, Guid personaId, string? name, string nickname);
    Task<Result<PersonaDto>> UpdatePersonaAvatarAsync(
        Guid baulId, Guid personaId, Stream content, string fileName, string contentType);
    Task<Result<PersonaDto>> UpdatePersonaRoleAsync(Guid baulId, Guid personaId, string role);
    Task<Result> RemovePersonaAsync(Guid baulId, Guid personaId);

    Task<Result<IEnumerable<RemovalRequestDto>>> GetRemovalRequestsAsync(Guid baulId);
    Task<Result<RemovalRequestDto>> CreateRemovalRequestAsync(Guid baulId, Guid photoId, string? reason);
    Task<Result> ApproveRemovalRequestAsync(Guid baulId, Guid requestId);
    Task<Result> RejectRemovalRequestAsync(Guid baulId, Guid requestId);

    Task<Result<IEnumerable<RecuerdoDto>>> GetRecuerdosAsync(Guid baulId);
    Task<Result<RecuerdoDto>> CreateRecuerdoAsync(Guid baulId, string text);
}
