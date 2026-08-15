using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.Core.Photos;
public interface IPhotoReadManager
{
    Task<Result<IEnumerable<PhotoDto>>> GetByChapterIdAsync(ChapterId chapterId);
    Task<Result<IEnumerable<PhotoDto>>> GetLooseByBaulIdAsync(BaulId baulId);
    Task<Result<PhotoPageDto>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take);

    Task<Result<PhotoDownloadResult>> DownloadAsync(PhotoId photoId);

    Task<Result<IEnumerable<PhotoDto>>> GetByPersonaIdAsync(BaulId baulId, PersonaId personaId);

    /// <summary>The photo behind the "help us tag this photo" contribution suggestion shown on
    /// entering a baúl's feed — a random active photo with no persona tagged yet and not
    /// confirmed as having nobody in it, or a successful null result once none remain.</summary>
    Task<Result<PhotoDto?>> GetUntaggedSuggestionAsync(BaulId baulId);

    /// <summary>The photo behind the "write a memory" contribution suggestion, the alternative
    /// to GetUntaggedSuggestionAsync shown on entering a baúl's feed — a random active photo
    /// with no recuerdo written yet, or a successful null result once none remain.</summary>
    Task<Result<PhotoDto?>> GetMemorySuggestionAsync(BaulId baulId);

    /// <summary>Every active photo in one upload batch, chronologically ascending — backs the
    /// batch's own grid/gallery reached from a feed card. Fails with a Validation error while
    /// Features:BaulFeedEnabled is off — see IAppConfiguration.BaulFeedEnabled.</summary>
    Task<Result<IEnumerable<PhotoDto>>> GetBatchPhotosAsync(BaulId baulId, Guid batchId);
}
