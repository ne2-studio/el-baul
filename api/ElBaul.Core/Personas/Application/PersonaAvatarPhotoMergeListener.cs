using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;

namespace ElBaul.Core.Personas.Application;

/// <summary>
/// Personas' side of Photos.OutputPorts.IPhotoMergeListener for avatars: same redirect rationale as
/// BaulCoverPhotoMergeListener/ChapterCoverPhotoMergeListener, but for a persona's AvatarPhotoId.
/// </summary>
public class PersonaAvatarPhotoMergeListener(IPersonaRepository personaRepository) : IPhotoMergeListener
{
    public async Task OnPhotosMergedAsync(PhotoMergeResult result, DateTime now)
    {
        var personas = await personaRepository.GetPersonasAsync(result.Survivor.BaulId);
        foreach (var persona in personas.Where(p => p.AvatarPhotoId is { } avatarPhotoId && result.Duplicates.Any(d => d.Id == avatarPhotoId)))
            await personaRepository.UpdatePersonaAsync(persona.WithAvatarPhotoId(result.Survivor.Id));
    }
}
