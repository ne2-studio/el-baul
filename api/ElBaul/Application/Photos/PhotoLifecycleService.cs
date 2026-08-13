using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
namespace ElBaul.Application.Photos;
public class PhotoLifecycleService(
    IPhotoRepository photoRepository,
    IChapterRepository chapterRepository,
    IBaulRepository baulRepository,
    IClock clock)
{
    public async Task AddAsync(Photo photo, Chapter? chapter, Baul baul, DateTime now)
    {
        if (chapter is not null)
        {
            await chapterRepository.UpdateAsync(chapter.WithPhotoAdded(photo, now));
        }

        await baulRepository.UpdateAsync(baul.WithPhotoAdded(photo, now));
    }

    public async Task<Photo> MoveAsync(Photo photo, Chapter? sourceChapter, Chapter targetChapter)
    {
        var now = clock.UtcNow();

        if (sourceChapter is not null)
        {
            await chapterRepository.UpdateAsync(sourceChapter.WithPhotoRemoved(photo, now));
        }

        var updatedPhoto = photo.InChapter(targetChapter.Id);
        await photoRepository.UpdateAsync(updatedPhoto);

        await chapterRepository.UpdateAsync(targetChapter.WithPhotoAdded(photo, now));

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
