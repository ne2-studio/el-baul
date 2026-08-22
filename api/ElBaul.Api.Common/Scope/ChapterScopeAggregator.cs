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
        // Awaited sequentially, not fanned out with Task.WhenAll: both managers share the same
        // request-scoped DbContext, and EF Core's DbContext isn't safe for concurrent use by
        // multiple in-flight operations (it throws InvalidOperationException when two do).
        var photosResult = await photoReadManager.GetByChapterIdAsync(chapterId);
        if (photosResult.IsFailure) return Result.Failure<ChapterScopeDto>(photosResult.Error);

        var recuerdosResult = await recuerdoManager.GetRecuerdosAsync(chapterId);
        if (recuerdosResult.IsFailure) return Result.Failure<ChapterScopeDto>(recuerdosResult.Error);

        return Result.Success(new ChapterScopeDto(photosResult.Value, recuerdosResult.Value));
    }
}
