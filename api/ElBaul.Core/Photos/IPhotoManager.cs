using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.Core.Photos;
public interface IPhotoManager
{
    Task<Result<PhotoDto>> UploadAsync(
        ChapterId chapterId,
        Stream content,
        ClientUploadId clientUploadId,
        Guid? uploadBatchId = null);

    Task<Result<PhotoDto>> UploadToBaulAsync(
        BaulId baulId,
        Stream content,
        ClientUploadId clientUploadId,
        Guid? uploadBatchId = null);

    Task<Result<PhotoDto>> MoveAsync(PhotoId photoId, ChapterId targetChapterId);

    Task<Result> DeleteAsync(PhotoId photoId, string? reason);

    /// <summary>Batch counterpart to DeleteAsync, for deleting a multi-selection of photos at
    /// once with a single shared reason — see ChangeDateBatchAsync for the best-effort
    /// skip-and-log semantics this mirrors. Reuses PhotoDeletePolicy unchanged per-photo, so a
    /// photo that's no longer eligible (e.g. its grace period expired between the client's
    /// eligibility check and this call) is skipped rather than aborting the whole batch.</summary>
    Task<Result> DeleteBatchAsync(IEnumerable<PhotoId> photoIds, string? reason);

    Task<Result<PhotoDto>> ChangeDateAsync(PhotoId photoId, PhotoDate date);
    Task<Result<IEnumerable<PhotoDto>>> ChangeDateBatchAsync(IEnumerable<PhotoId> photoIds, PhotoDate date);

    /// <summary>Clears a photo's date back to unknown — the counterpart to ChangeDateAsync for
    /// when the family realizes the date they had wasn't right, without knowing a replacement.</summary>
    Task<Result<PhotoDto>> ClearDateAsync(PhotoId photoId);

    /// <summary>Batch counterpart to ClearDateAsync, for clearing the date of a multi-selection
    /// of photos at once — see ChangeDateBatchAsync for the best-effort skip-and-log semantics
    /// this mirrors.</summary>
    Task<Result<IEnumerable<PhotoDto>>> ClearDateBatchAsync(IEnumerable<PhotoId> photoIds);

    /// <summary>Confirms nobody appears in this photo, so it stops being proposed by the
    /// contribution suggestion even though it never received a PhotoPersonaTag. Reversed
    /// automatically the moment the photo actually gets tagged.</summary>
    Task<Result<PhotoDto>> ConfirmNoPersonasAsync(PhotoId photoId);
}
