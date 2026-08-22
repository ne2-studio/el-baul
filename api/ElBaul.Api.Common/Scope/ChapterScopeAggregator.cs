using ElBaul.Api.Models;
using ElBaul.Core.Photos;
using ElBaul.Core.Recuerdos;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Api.Scope;

// See BaulScopeAggregator's doc comment for why this lives here instead of in ElBaul.Core.
public class ChapterScopeAggregator(IPhotoReadManager photoReadManager, IRecuerdoManager recuerdoManager)
{
    public async Task<Result<ChapterScopeDto>> GetScopeAsync(ChapterId chapterId)
    {
        var photosTask = photoReadManager.GetByChapterIdAsync(chapterId);
        var recuerdosTask = recuerdoManager.GetRecuerdosAsync(chapterId);
        await Task.WhenAll(photosTask, recuerdosTask);

        if (photosTask.Result.IsFailure) return Result.Failure<ChapterScopeDto>(photosTask.Result.Error);
        if (recuerdosTask.Result.IsFailure) return Result.Failure<ChapterScopeDto>(recuerdosTask.Result.Error);

        return Result.Success(new ChapterScopeDto(photosTask.Result.Value, recuerdosTask.Result.Value));
    }
}
