using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public class PersonaDtoProjector(
    IPhotoRepository photoRepository,
    IPhotoStorage photoStorage) : IPersonaDtoProjector
{
    public async Task<PersonaDto> ProjectAsync(Persona persona, User? user, bool canEdit)
    {
        var avatarUrl = await GetPersonaAvatarUrlAsync(persona);

        return new PersonaDto(
            persona.Id.ToString(), persona.UserId, user?.Email, persona.Name ?? user?.Name,
            persona.Nickname, persona.Role.ToApiString(), persona.Role == BaulRole.SinAcceso ? "sin_acceso" : persona.IsClaimed ? "active" : "pending",
            persona.InvitedDate, persona.BaulId.ToString(), avatarUrl, canEdit, persona.Biografia,
            persona.AvatarPhotoId?.ToString(), persona.AvatarCropX, persona.AvatarCropY, persona.AvatarCropScale);
    }

    private async Task<string?> GetPersonaAvatarUrlAsync(Persona persona)
    {
        var crop = new ImageCrop(persona.AvatarCropX, persona.AvatarCropY, persona.AvatarCropScale);

        if (persona.AvatarPhotoId is { } photoId)
        {
            var photo = await photoRepository.GetByIdAsync(photoId);
            return photo is not null && photo.BaulId == persona.BaulId && photo.Status == PhotoStatus.Active
                ? await photoStorage.GetImageUrl(photo.StorageKey, ImagePlacement.PersonaAvatar, crop)
                : null;
        }

        return persona.AvatarPhotoKey is { Length: > 0 }
            ? await photoStorage.GetImageUrl(persona.AvatarPhotoKey, ImagePlacement.PersonaAvatar, crop)
            : null;
    }
}
