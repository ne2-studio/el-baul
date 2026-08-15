using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Core.Chapters.Application;

/// <summary>
/// Chapters' side of Photos.OutputPorts.IChapterPhotoCountListener — see its doc comment. Fetches
/// the chapter itself rather than receiving it from the caller: Photos no longer holds a Chapter
/// to hand over, only a ChapterId.
/// </summary>
public class ChapterPhotoCountListener(IChapterRepository chapterRepository) : IChapterPhotoCountListener
{
    public async Task OnPhotoAddedAsync(ChapterId chapterId, PhotoRef photo, DateTime now)
    {
        var chapter = await chapterRepository.GetByIdAsync(chapterId);
        if (chapter is null) return;

        await chapterRepository.UpdateAsync(chapter.WithPhotoAdded(photo, now));
    }

    public async Task OnPhotoRemovedAsync(ChapterId chapterId, PhotoRef photo, DateTime now)
    {
        var chapter = await chapterRepository.GetByIdAsync(chapterId);
        if (chapter is null) return;

        await chapterRepository.UpdateAsync(chapter.WithPhotoRemoved(photo, now));
    }
}
