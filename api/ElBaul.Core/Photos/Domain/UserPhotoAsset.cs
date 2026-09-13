using ElBaul.Domain;
namespace ElBaul.Core.Photos.Domain;

// The explicit "this PhotoAsset is in this user's personal photo space" relation (Slice 2.5,
// docs/.backlog issue #62): a plain join, not its own aggregate — no identity beyond the
// (UserId, PhotoAssetId) pair, same shape as PhotoPersonaTag.
//
// Deliberately NOT ownership of the canonical PhotoAsset — PhotoAsset itself is globally
// canonical and has no single product-level owner (see PhotoAsset's own doc comment). This
// relation means "this user has this asset in Mis fotos / has personally contributed it", and
// is what MyPhotosReadManager now queries instead of PhotoAsset.UploadedBy (which only ever
// recorded the *single* user who happened to create that PhotoAsset row first).
//
// Several users can each hold their own relation to the very same PhotoAsset (Pedro and Jaime
// independently uploading the exact same bytes) — that's the whole point of this slice's exact
// dedup: the canonical asset is shared, but each contributor still sees it in their own Mis
// fotos, and no contributor's identity leaks to another (see PhotoManager/PhotoUploadWorkflow).
//
// DeletedAt is this relation's soft-delete flag (Slice 5, docs/.backlog issue #62 — "Quitar de
// Mis fotos"), same general shape as Photo.DeletedAt but deliberately without a DeletionReason:
// Photo's reason exists to explain a removal to the other baúl members who'll notice the photo
// is gone; removing a PhotoAsset from one's own personal "Mis fotos" has no such audience — only
// the current user is ever affected (see PhotoManager.RemoveFromMyPhotosAsync). null means the
// asset is active in this user's Mis fotos; non-null means it isn't, but the row (and its
// AddedAt) survives so a later re-save (PhotoManager.SaveToMyPhotosAsync/EnsureUserPhotoAssetActiveAsync)
// reactivates the same row instead of violating the (UserId, PhotoAssetId) primary key with a
// second one. Every write to this column goes through raw SQL/ExecuteUpdateAsync
// (PhotoRepository), never through loading and mutating this record — see
// TryCreateUserPhotoAssetAsync's/EnsureUserPhotoAssetActiveAsync's own doc comments on why every
// write here already had to be race-safe SQL, not EF change-tracking.
public record UserPhotoAsset(UserId UserId, PhotoAssetId PhotoAssetId, DateTime AddedAt, DateTime? DeletedAt = null);
