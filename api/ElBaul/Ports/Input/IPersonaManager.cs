using ElBaul.Ports.Output;
using ElBaul.Ports.Shared;

namespace ElBaul.Ports.Input;

public interface IPersonaManager
{
    Task<Result<IEnumerable<PersonaDto>>> GetPersonasAsync(BaulId baulId);
    Task<Result<PersonaDto>> GetPersonaAsync(BaulId baulId, PersonaId personaId);
    Task<Result<PersonaDto>> CreatePersonaAsync(BaulId baulId, string nickname);
    Task<Result<PersonaDto>> UpdatePersonaAsync(BaulId baulId, PersonaId personaId, string? name, string nickname);
    Task<Result<PersonaDto>> UpdatePersonaBiografiaAsync(BaulId baulId, PersonaId personaId, string? biografia);
    Task<Result<PersonaDto>> UpdatePersonaAvatarAsync(
        BaulId baulId, PersonaId personaId, Stream content, string fileName, string contentType,
        AvatarCrop crop, ClientUploadId clientUploadId);
    Task<Result<PersonaDto>> SetPersonaAvatarPhotoAsync(BaulId baulId, PersonaId personaId, PhotoId photoId, AvatarCrop crop);
    Task<Result<PersonaDto>> UpdatePersonaRoleAsync(BaulId baulId, PersonaId personaId, BaulRole role);
    Task<Result> RemovePersonaAsync(BaulId baulId, PersonaId personaId);
}

public record AvatarCrop(decimal X, decimal Y, decimal Scale)
{
    public static Result<AvatarCrop> Create(decimal x, decimal y, decimal scale)
    {
        if (x is < 0m or > 1m) return Result.Failure<AvatarCrop>(ApplicationError.Validation("Avatar crop x must be between 0 and 1"));
        if (y is < 0m or > 1m) return Result.Failure<AvatarCrop>(ApplicationError.Validation("Avatar crop y must be between 0 and 1"));
        if (scale is < 1m or > 3m) return Result.Failure<AvatarCrop>(ApplicationError.Validation("Avatar crop scale must be between 1 and 3"));
        return new AvatarCrop(x, y, scale);
    }
}
