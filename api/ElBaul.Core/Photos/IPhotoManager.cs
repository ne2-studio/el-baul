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

    /// <summary>"Add to another baúl" (docs/.backlog issue #62, Slice 2): creates a new Photo in
    /// <paramref name="targetBaulId"/> that references the exact same PhotoAsset as
    /// <paramref name="sourcePhotoId"/> — no image is copied, re-uploaded or duplicated in
    /// storage. The caller must be able to view the source photo and add content to the target
    /// baúl (same AccessLevel.Member gate as a normal upload). Idempotent-ish: if that asset is
    /// already active in the target baúl, returns the existing Photo there instead of creating a
    /// second one or failing.</summary>
    Task<Result<PhotoDto>> AddToBaulAsync(PhotoId sourcePhotoId, BaulId targetBaulId);

    /// <summary>The Mis fotos counterpart to AddToBaulAsync: same domain factory, DB constraint
    /// and idempotent-ish semantics, but authorized off the caller's own UserPhotoAsset relation
    /// (the "you have this asset in Mis fotos" rule Mis fotos itself is keyed on) instead of an
    /// accessible source Photo, since Mis fotos has no single baúl to prove access through.
    /// Returns just the new/existing appearance rather than a full PhotoDto — Mis fotos only
    /// needs to patch its "Aparece en" list, not re-render a baúl-scoped photo.</summary>
    Task<Result<BaulAppearanceDto>> AddAssetToBaulAsync(PhotoAssetId assetId, BaulId targetBaulId);

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
