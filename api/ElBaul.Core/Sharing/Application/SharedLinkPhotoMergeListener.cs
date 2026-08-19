using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Sharing.OutputPorts;

namespace ElBaul.Core.Sharing.Application;

/// <summary>
/// Sharing's side of Photos.OutputPorts.IPhotoMergeListener: a link generated for a duplicate must
/// keep working, pointing at the survivor, rather than silently breaking once the duplicate is
/// soft-deleted.
/// </summary>
public class SharedLinkPhotoMergeListener(ISharedLinkRepository sharedLinkRepository) : IPhotoMergeListener
{
    public async Task OnPhotosMergedAsync(PhotoMergeResult result, DateTime now)
    {
        var duplicateIds = result.Duplicates.Select(d => d.Id).ToList();
        foreach (var sharedLink in await sharedLinkRepository.GetByPhotoIdsAsync(duplicateIds))
            await sharedLinkRepository.UpdateAsync(sharedLink.ForPhoto(result.Survivor.Id));
    }
}
