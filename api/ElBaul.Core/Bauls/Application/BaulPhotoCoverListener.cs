using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Core.Bauls.Application;

/// <summary>
/// Bauls' side of Photos.OutputPorts.IBaulPhotoCoverListener — see its doc comment. Fetches the
/// baúl itself rather than receiving it from the caller, same reason as ChapterPhotoCountListener.
/// </summary>
public class BaulPhotoCoverListener(IBaulRepository baulRepository) : IBaulPhotoCoverListener
{
    public async Task OnPhotoAddedAsync(BaulId baulId, PhotoId photoId, DateTime now)
    {
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null) return;

        await baulRepository.UpdateAsync(baul.WithPhotoAdded(photoId, now));
    }

    public async Task OnPhotoRemovedAsync(BaulId baulId, PhotoId photoId, DateTime now)
    {
        var baul = await baulRepository.GetByIdAsync(baulId);
        if (baul is null || baul.CoverPhotoId != photoId) return;

        await baulRepository.UpdateAsync(baul.WithPhotoRemoved(photoId, now));
    }
}
