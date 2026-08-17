using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;

namespace ElBaul.Core.Chapters.Application;

/// <summary>
/// Chapters' side of Photos.OutputPorts.IPhotoMergeListener — same rationale/redirect as
/// BaulCoverPhotoMergeListener, but for a chapter's own CoverPhotoId.
/// </summary>
public class ChapterCoverPhotoMergeListener(IChapterRepository chapterRepository) : IPhotoMergeListener
{
    public async Task OnPhotosMergedAsync(PhotoMergeResult result, DateTime now)
    {
        var chapterIds = result.Duplicates.Select(d => d.ChapterId).Where(id => id is not null).Select(id => id!.Value).Distinct();
        foreach (var chapterId in chapterIds)
        {
            var chapter = await chapterRepository.GetByIdAsync(chapterId);
            if (chapter is not null && result.Duplicates.Any(d => d.ChapterId == chapterId && d.Id == chapter.CoverPhotoId))
                await chapterRepository.UpdateAsync(chapter.WithCoverPhotoId(result.Survivor.Id, now));
        }
    }
}
