using ElBaul.Domain;
using ElBaul.InputPorts.Personas;
using Ne2Studio.Common;

namespace ElBaul.InputPorts.Personas;
public interface IPersonaManager
{
    Task<Result<IEnumerable<PersonaDto>>> GetPersonasAsync(BaulId baulId);
    Task<Result<PersonaDto>> GetPersonaAsync(BaulId baulId, PersonaId personaId);
    Task<Result<PersonaDto>> CreatePersonaAsync(BaulId baulId, string nickname);
    Task<Result<PersonaDto>> UpdatePersonaAsync(BaulId baulId, PersonaId personaId, string? name, string nickname);
    Task<Result<PersonaDto>> UpdatePersonaBiografiaAsync(BaulId baulId, PersonaId personaId, string? biografia);
    Task<Result<PersonaDto>> UpdatePersonaAvatarAsync(
        BaulId baulId, PersonaId personaId, Stream content, string fileName, string contentType,
        PhotoCrop crop, ClientUploadId clientUploadId);
    Task<Result<PersonaDto>> SetPersonaAvatarPhotoAsync(BaulId baulId, PersonaId personaId, PhotoId photoId, PhotoCrop crop);
    Task<Result<PersonaDto>> UpdatePersonaRoleAsync(BaulId baulId, PersonaId personaId, BaulRole role);
    Task<Result> RemovePersonaAsync(BaulId baulId, PersonaId personaId);
}
