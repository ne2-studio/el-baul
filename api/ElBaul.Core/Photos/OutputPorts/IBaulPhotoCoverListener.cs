using ElBaul.Domain;
namespace ElBaul.Core.Photos.OutputPorts;

/// <summary>
/// Photos' equivalent of IChapterPhotoCountListener for Bauls: notified synchronously, inside the
/// same transaction, whenever a photo enters a baúl or leaves it (soft delete), so Bauls can
/// maintain its own CoverPhotoId without Photos writing into Bauls.OutputPorts directly. See
/// IChapterPhotoCountListener's doc comment — same rationale, same shape.
/// </summary>
public interface IBaulPhotoCoverListener
{
    Task OnPhotoAddedAsync(BaulId baulId, PhotoId photoId, DateTime now);
    Task OnPhotoRemovedAsync(BaulId baulId, PhotoId photoId, DateTime now);
}
