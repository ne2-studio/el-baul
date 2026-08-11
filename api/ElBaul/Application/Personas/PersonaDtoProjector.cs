using ElBaul.Application.Personas;
using ElBaul.InputPorts.Personas;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Users;

namespace ElBaul.Application.Personas;
public class PersonaDtoProjector(
    IPhotoRepository photoRepository,
    IPhotoStorage photoStorage) : IPersonaDtoProjector
{
    public async Task<PersonaDto> ProjectAsync(Persona persona, User? user, bool canEdit)
    {
        var avatarUrl = await PersonaAvatarUrlResolver.ResolveAsync(persona, photoRepository, photoStorage);
        return BuildDto(persona, user, canEdit, avatarUrl);
    }

    public async Task<IReadOnlyList<PersonaDto>> ProjectManyAsync(IEnumerable<(Persona Persona, User? User, bool CanEdit)> items)
    {
        var itemList = items.ToList();

        var avatarPhotoIds = itemList
            .Where(i => i.Persona.AvatarPhotoId is not null)
            .Select(i => i.Persona.AvatarPhotoId!.Value)
            .Distinct()
            .ToList();
        var photosById = avatarPhotoIds.Count == 0
            ? new Dictionary<PhotoId, Photo>()
            : (await photoRepository.GetByIdsAsync(avatarPhotoIds)).ToDictionary(p => p.Id);

        var dtos = new List<PersonaDto>(itemList.Count);
        foreach (var (persona, user, canEdit) in itemList)
        {
            var avatarPhoto = persona.AvatarPhotoId is { } photoId ? photosById.GetValueOrDefault(photoId) : null;
            var avatarUrl = await PersonaAvatarUrlResolver.ResolveAsync(persona, avatarPhoto, photoStorage);
            dtos.Add(BuildDto(persona, user, canEdit, avatarUrl));
        }

        return dtos;
    }

    private static PersonaDto BuildDto(Persona persona, User? user, bool canEdit, string? avatarUrl) =>
        new(persona.Id.ToString(), persona.UserId, user?.Email, persona.Name ?? user?.Name,
            persona.Nickname, persona.Role.ToApiString(), persona.AccessStatus.ToApiString(),
            persona.InvitedDate, persona.BaulId.ToString(), avatarUrl, canEdit, persona.Biografia,
            persona.AvatarPhotoId?.ToString(), persona.AvatarCropX, persona.AvatarCropY, persona.AvatarCropScale);
}
