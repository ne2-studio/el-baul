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
public record UserPhotoAsset(UserId UserId, PhotoAssetId PhotoAssetId, DateTime AddedAt);
