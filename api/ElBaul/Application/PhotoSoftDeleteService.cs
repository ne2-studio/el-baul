using ElBaul.Ports.Output;

namespace ElBaul.Application;

public class PhotoSoftDeleteService(
    IPhotoRepository photoRepository,
    IChapterRepository chapterRepository,
    IBaulRepository baulRepository,
    IClock clock)
{
    public async Task SoftDeleteAsync(Photo photo, string? reason)
    {
        if (photo.Status == PhotoStatus.Deleted) return;

        var now = clock.UtcNow();
        var updatedPhoto = photo with
        {
            Status = PhotoStatus.Deleted,
            DeletedAt = now,
            DeletionReason = reason
        };
        await photoRepository.UpdateAsync(updatedPhoto);

        if (photo.ChapterId is { } chapterId)
        {
            var chapter = await chapterRepository.GetByIdAsync(chapterId);
            if (chapter is not null)
            {
                await chapterRepository.UpdateAsync(chapter.WithPhotoRemoved(photo, now));
            }
        }

        var baul = await baulRepository.GetByIdAsync(photo.BaulId);
        if (baul is not null && baul.CoverPhotoKey == photo.StorageKey)
        {
            await baulRepository.UpdateAsync(baul.WithPhotoRemoved(photo, now));
        }
    }
}
