using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Core.Photos.Application;

// Orchestrates the write-side bookkeeping every photo lifecycle transition needs — chapter/baúl
// PhotoCount and CoverPhotoId — without depending on IChapterRepository/IBaulRepository
// directly. Chapter/Baul react to these transitions via IChapterPhotoCountListener/
// IBaulPhotoCoverListener instead, each doing its own fetch-then-update: one extra round trip in
// the few call sites where the caller already had the Chapter/Baul loaded, traded for Photos not
// needing to know Chapters'/Bauls' repositories at all. Not worth it on a hot read path; this one
// only runs on upload/move/delete, so the trade is cheap.
public class PhotoLifecycleService(
    IPhotoRepository photoRepository,
    IChapterPhotoCountListener chapterPhotoCountListener,
    IBaulPhotoCoverListener baulPhotoCoverListener,
    IClock clock)
{
    public async Task AddAsync(Photo photo, ChapterId? chapterId, BaulId baulId, DateTime now)
    {
        if (chapterId is { } id)
        {
            await chapterPhotoCountListener.OnPhotoAddedAsync(id, photo.Id, now);
        }

        await baulPhotoCoverListener.OnPhotoAddedAsync(baulId, photo.Id, now);
    }

    public async Task<Photo> MoveAsync(Photo photo, ChapterId? sourceChapterId, ChapterId targetChapterId)
    {
        var now = clock.UtcNow();
        if (sourceChapterId is { } id)
        {
            await chapterPhotoCountListener.OnPhotoRemovedAsync(id, photo.Id, now);
        }

        var updatedPhoto = photo.InChapter(targetChapterId);
        await photoRepository.UpdateAsync(updatedPhoto);

        await chapterPhotoCountListener.OnPhotoAddedAsync(targetChapterId, photo.Id, now);

        return updatedPhoto;
    }

    public async Task SoftDeleteAsync(Photo photo, string? reason)
    {
        if (photo.Status == PhotoStatus.Deleted) return;

        var now = clock.UtcNow();
        var updatedPhoto = photo.MarkDeleted(reason, now);
        await photoRepository.UpdateAsync(updatedPhoto);

        if (photo.ChapterId is { } chapterId)
        {
            await chapterPhotoCountListener.OnPhotoRemovedAsync(chapterId, photo.Id, now);
        }

        await baulPhotoCoverListener.OnPhotoRemovedAsync(photo.BaulId, photo.Id, now);
    }
}
