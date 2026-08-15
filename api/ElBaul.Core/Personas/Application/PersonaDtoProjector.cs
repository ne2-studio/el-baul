using ElBaul.Domain;
using ElBaul.Core.Application;
using ElBaul.Core.Personas.InputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.Users.OutputPorts;

namespace ElBaul.Core.Personas.Application;
public class PersonaDtoProjector(
    IPhotoRepository photoRepository,
    IPhotoStorage photoStorage,
    IUserRepository userRepository) : IPersonaDtoProjector
{
    public async Task<PersonaDto> ProjectAsync(Persona persona, bool canEdit, UserId custodioId)
    {
        var user = persona.IsClaimed ? await userRepository.GetByIdAsync(persona.UserId!.Value) : null;
        return await ProjectWithResolvedUserAsync(persona, user, canEdit, custodioId);
    }

    public async Task<PersonaDto> ProjectWithResolvedUserAsync(Persona persona, User? user, bool canEdit, UserId custodioId)
    {
        var avatarUrl = await PersonaAvatarUrlResolver.ResolveAsync(persona, photoRepository, photoStorage);
        return BuildDto(persona, user, canEdit, avatarUrl, custodioId);
    }

    public async Task<IReadOnlyList<PersonaDto>> ProjectManyAsync(IEnumerable<(Persona Persona, User? User, bool CanEdit)> items, UserId custodioId)
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
            dtos.Add(BuildDto(persona, user, canEdit, avatarUrl, custodioId));
        }

        return dtos;
    }

    // Role and IsCustodio are reported as two independent facts, not one synthesized string —
    // custody isn't a BaulRole value (see BaulRole.cs), so Role always reflects the persona's
    // actual assignable tier and IsCustodio is compared against custodioId separately.
    private static PersonaDto BuildDto(Persona persona, User? user, bool canEdit, string? avatarUrl, UserId custodioId) =>
        new(persona.Id.ToString(), persona.UserId, user?.Email, persona.Name ?? user?.Name,
            persona.Nickname, persona.Role.ToApiString(), persona.UserId == custodioId, persona.AccessStatus.ToApiString(),
            persona.InvitedDate, persona.BaulId.ToString(), avatarUrl, canEdit, persona.Biografia,
            persona.AvatarPhotoId?.ToString(), persona.AvatarCropX, persona.AvatarCropY, persona.AvatarCropScale);
}
