using ElBaul.Domain;
using ElBaul.InputPorts.Photos;
using Ne2Studio.Common;

namespace ElBaul.InputPorts.Photos;
public interface IPhotoManager
{
    Task<Result<IEnumerable<PhotoDto>>> GetByChapterIdAsync(ChapterId chapterId);
    Task<Result<IEnumerable<PhotoDto>>> GetLooseByBaulIdAsync(BaulId baulId);
    Task<Result<PhotoPageDto>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take);

    Task<Result<PhotoDto>> UploadAsync(
        ChapterId chapterId,
        Stream content,
        string fileName,
        string contentType,
        PhotoDate? date,
        ClientUploadId clientUploadId,
        Guid? uploadBatchId = null);

    Task<Result<PhotoDto>> UploadToBaulAsync(
        BaulId baulId,
        Stream content,
        string fileName,
        string contentType,
        PhotoDate? date,
        ClientUploadId clientUploadId,
        Guid? uploadBatchId = null);

    Task<Result<PhotoDto>> MoveAsync(PhotoId photoId, ChapterId targetChapterId);

    Task<Result> DeleteAsync(PhotoId photoId, string? reason);

    Task<Result<PhotoDto>> ChangeDateAsync(PhotoId photoId, PhotoDate date);
    Task<Result<IEnumerable<PhotoDto>>> ChangeDateBatchAsync(IEnumerable<PhotoId> photoIds, PhotoDate date);

    /// <summary>Clears a photo's date back to unknown — the counterpart to ChangeDateAsync for
    /// when the family realizes the date they had wasn't right, without knowing a replacement.</summary>
    Task<Result<PhotoDto>> ClearDateAsync(PhotoId photoId);

    Task<Result<PhotoDownloadResult>> DownloadAsync(PhotoId photoId);

    Task<Result<IEnumerable<PhotoDto>>> GetByPersonaIdAsync(BaulId baulId, PersonaId personaId);

    /// <summary>The photo behind the "help us tag this photo" contribution suggestion shown on
    /// entering a baúl's feed — a random active photo with no persona tagged yet and not
    /// confirmed as having nobody in it, or a successful null result once none remain.</summary>
    Task<Result<PhotoDto?>> GetUntaggedSuggestionAsync(BaulId baulId);

    /// <summary>Confirms nobody appears in this photo, so it stops being proposed by the
    /// contribution suggestion even though it never received a PhotoPersonaTag. Reversed
    /// automatically the moment the photo actually gets tagged.</summary>
    Task<Result<PhotoDto>> ConfirmNoPersonasAsync(PhotoId photoId);
}
