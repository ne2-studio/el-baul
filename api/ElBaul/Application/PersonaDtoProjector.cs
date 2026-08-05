using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public class PersonaDtoProjector(
    IPhotoRepository photoRepository,
    IPhotoStorage photoStorage) : IPersonaDtoProjector
{
    public async Task<PersonaDto> ProjectAsync(Persona persona, User? user, bool canEdit)
    {
        var avatarUrl = await PersonaAvatarUrlResolver.ResolveAsync(persona, photoRepository, photoStorage);

        return new PersonaDto(
            persona.Id.ToString(), persona.UserId, user?.Email, persona.Name ?? user?.Name,
            persona.Nickname, persona.Role.ToApiString(), persona.AccessStatus.ToApiString(),
            persona.InvitedDate, persona.BaulId.ToString(), avatarUrl, canEdit, persona.Biografia,
            persona.AvatarPhotoId?.ToString(), persona.AvatarCropX, persona.AvatarCropY, persona.AvatarCropScale);
    }
}
