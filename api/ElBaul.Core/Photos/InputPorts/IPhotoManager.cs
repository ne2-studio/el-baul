using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.Core.Photos.InputPorts;
public interface IPhotoManager
{
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

    /// <summary>Batch counterpart to ClearDateAsync, for clearing the date of a multi-selection
    /// of photos at once — see ChangeDateBatchAsync for the best-effort skip-and-log semantics
    /// this mirrors.</summary>
    Task<Result<IEnumerable<PhotoDto>>> ClearDateBatchAsync(IEnumerable<PhotoId> photoIds);

    /// <summary>Confirms nobody appears in this photo, so it stops being proposed by the
    /// contribution suggestion even though it never received a PhotoPersonaTag. Reversed
    /// automatically the moment the photo actually gets tagged.</summary>
    Task<Result<PhotoDto>> ConfirmNoPersonasAsync(PhotoId photoId);
}
