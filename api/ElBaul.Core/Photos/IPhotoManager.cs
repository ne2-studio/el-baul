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

    /// <summary>Uploads directly into "Mis fotos" (Slice 3, docs/.backlog issue #62): resolves/
    /// creates the caller's canonical PhotoAsset and their UserPhotoAsset relation, but creates
    /// no Photo and involves no baúl at all — the asset starts out belonging to zero baúles, a
    /// legitimate first-class state (see PhotoUploadWorkflow.IngestAssetAsync). The caller is
    /// always derived from the auth token, never a client-supplied UserId.</summary>
    Task<Result<PhotoAssetDto>> UploadToMyPhotosAsync(Stream content, ClientUploadId clientUploadId);

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

    /// <summary>"Quitar de Mis fotos" (Slice 5, docs/.backlog issue #62): soft-deletes ONLY the
    /// current user's own UserPhotoAsset relation to this asset. Never touches the PhotoAsset
    /// itself, any Photo projection in any baúl, or any other user's relation — see
    /// UserPhotoAsset's own doc comment. The caller is always derived from the auth token;
    /// there is no way to target another user's relation. Idempotent: succeeds even if the
    /// relation is already removed or never existed, so a stale/duplicate client request is
    /// never an error.</summary>
    Task<Result> RemoveFromMyPhotosAsync(PhotoAssetId assetId);

    /// <summary>Batch counterpart to RemoveFromMyPhotosAsync, for "Quitar de Mis fotos" over a
    /// multi-selection — one statement, scoped to the current user the same way the single-item
    /// version is (see PhotoRepository.SoftDeleteUserPhotoAssetsAsync). Never partially fails:
    /// unknown/already-removed ids are silently ignored rather than aborting the rest.</summary>
    Task<Result> RemoveFromMyPhotosBatchAsync(IEnumerable<PhotoAssetId> assetIds);

    /// <summary>"Guardar en Mis fotos" from inside a baúl (Slice 5, docs/.backlog issue #62):
    /// ensures the current user has an ACTIVE UserPhotoAsset relation to <paramref
    /// name="sourcePhotoId"/>'s PhotoAsset — creating it if it never existed, reactivating it if
    /// it was previously removed (see EnsureUserPhotoAssetActiveAsync), or no-op if already
    /// active. Never copies the binary, never creates a second PhotoAsset, never touches the
    /// source Photo or any other user. Authorized the same way viewing/adding a photo already
    /// is (AccessLevel.Member on the source photo's baúl) — see this method's implementation for
    /// why no narrower permission exists today.</summary>
    Task<Result<PhotoAssetDto>> SaveToMyPhotosAsync(PhotoId sourcePhotoId);

    /// <summary>Batch counterpart to SaveToMyPhotosAsync, for a baúl's multi-selection — same
    /// best-effort skip-and-log semantics as ChangeDateBatchAsync/DeleteBatchAsync. Several
    /// selected Photos may share the same PhotoAsset (Slice 2's cross-baúl asset reuse); calling
    /// SaveToMyPhotosAsync once per photo is still race-safe and never creates more than one
    /// active relation per asset, since EnsureUserPhotoAssetActiveAsync is itself idempotent on
    /// (UserId, PhotoAssetId).</summary>
    Task<Result<IEnumerable<PhotoAssetDto>>> SaveToMyPhotosBatchAsync(IEnumerable<PhotoId> sourcePhotoIds);

    /// <summary>Batch counterpart to AddAssetToBaulAsync, for a Mis fotos multi-selection —
    /// reuses that same method (and its authorization/idempotency) once per distinct asset id,
    /// best-effort skip-and-log like DeleteBatchAsync. An asset already active in the target
    /// baúl is treated as a success (its existing appearance), never an error — see issue #62's
    /// "Bulk add-to-baúl result handling".</summary>
    Task<Result<IEnumerable<BaulAppearanceDto>>> AddAssetsToBaulBatchAsync(IEnumerable<PhotoAssetId> assetIds, BaulId targetBaulId);
}
