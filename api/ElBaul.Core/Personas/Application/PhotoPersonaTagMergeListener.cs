using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;

namespace ElBaul.Core.Personas.Application;

/// <summary>
/// Personas' side of Photos.OutputPorts.IPhotoMergeListener for tags: union every duplicate's
/// tagged people onto the survivor's own — SetTagsAsync replaces the survivor's full tag set, and a
/// persona already tagged on the survivor is naturally deduplicated by the Distinct() below (see
/// PhotoPersonaTagManager, the same "photo can only carry one relationship per PersonaId"
/// invariant).
/// </summary>
public class PhotoPersonaTagMergeListener(IPhotoPersonaTagRepository photoPersonaTagRepository) : IPhotoMergeListener
{
    public async Task OnPhotosMergedAsync(PhotoMergeResult result, DateTime now)
    {
        var allIds = result.Duplicates.Select(d => d.Id).Append(result.Survivor.Id).ToList();
        var tagsByPhoto = await photoPersonaTagRepository.GetPersonaIdsByPhotoIdsAsync(allIds);
        var unionedPersonaIds = tagsByPhoto.Values.SelectMany(personaIds => personaIds).Distinct().ToList();
        if (unionedPersonaIds.Count > 0)
            await photoPersonaTagRepository.SetTagsAsync(result.Survivor.Id, result.Survivor.BaulId, unionedPersonaIds, now);
    }
}
