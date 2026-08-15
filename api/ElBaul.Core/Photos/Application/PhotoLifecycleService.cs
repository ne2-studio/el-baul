using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Core.Photos.Application;

// Orchestrates the write-side bookkeeping every photo lifecycle transition needs — chapter/baúl
// PhotoCount and CoverPhotoKey — without depending on IChapterRepository/IBaulRepository
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
        var photoRef = PhotoRef.From(photo);

        if (chapterId is { } id)
        {
            await chapterPhotoCountListener.OnPhotoAddedAsync(id, photoRef, now);
        }

        await baulPhotoCoverListener.OnPhotoAddedAsync(baulId, photoRef, now);
    }

    public async Task<Photo> MoveAsync(Photo photo, ChapterId? sourceChapterId, ChapterId targetChapterId)
    {
        var now = clock.UtcNow();
        var photoRef = PhotoRef.From(photo);

        if (sourceChapterId is { } id)
        {
            await chapterPhotoCountListener.OnPhotoRemovedAsync(id, photoRef, now);
        }

        var updatedPhoto = photo.InChapter(targetChapterId);
        await photoRepository.UpdateAsync(updatedPhoto);

        await chapterPhotoCountListener.OnPhotoAddedAsync(targetChapterId, photoRef, now);

        return updatedPhoto;
    }

    public async Task SoftDeleteAsync(Photo photo, string? reason)
    {
        if (photo.Status == PhotoStatus.Deleted) return;

        var now = clock.UtcNow();
        var updatedPhoto = photo.MarkDeleted(reason, now);
        await photoRepository.UpdateAsync(updatedPhoto);

        var photoRef = PhotoRef.From(photo);

        if (photo.ChapterId is { } chapterId)
        {
            await chapterPhotoCountListener.OnPhotoRemovedAsync(chapterId, photoRef, now);
        }

        await baulPhotoCoverListener.OnPhotoRemovedAsync(photo.BaulId, photoRef, now);
    }
}
