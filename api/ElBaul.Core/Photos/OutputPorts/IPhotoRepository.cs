using ElBaul.Core.Photos.Domain;
using ElBaul.Domain;
namespace ElBaul.Core.Photos.OutputPorts;
public interface IPhotoRepository
{
    Task<Photo?> GetByIdAsync(PhotoId id);
    Task<IEnumerable<Photo>> GetByIdsAsync(IEnumerable<PhotoId> ids);
    Task<Photo?> GetByClientUploadIdAsync(Guid clientUploadId);
    Task<IEnumerable<Photo>> GetByChapterIdAsync(ChapterId chapterId);

    /// <summary>Every photo in a chapter regardless of status (including soft-deleted) — used
    /// by chapter deletion, which must orphan every photo still pointing at the chapter before
    /// deleting it. Photo.ChapterId is a Cascade FK, so any photo left pointing at a deleted
    /// chapter (soft-deleted ones are skipped by the Active-only GetByChapterIdAsync) would be
    /// cascade-deleted by Postgres itself and then blocked by the Restrict FK from
    /// PhotoPersonaTags.</summary>
    Task<IEnumerable<Photo>> GetAllByChapterIdAsync(ChapterId chapterId);

    Task<IEnumerable<Photo>> GetLooseByBaulIdAsync(BaulId baulId);

    /// <summary>Every active photo in a baúl, chapter-linked and loose alike, in one query —
    /// used to batch what would otherwise be one GetByChapterIdAsync round trip per chapter
    /// (e.g. ChatContextBuilder grouping a baúl's photos by chapter for the AI prompt).</summary>
    Task<IEnumerable<Photo>> GetActiveByBaulIdAsync(BaulId baulId);
    /// <summary>Active photos created since <paramref name="since"/>, excluding ones uploaded by
    /// <paramref name="excludingUserId"/> — used by the weekly digest, which has no reason to
    /// tell a user about their own contributions.</summary>
    Task<IEnumerable<Photo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since, UserId excludingUserId);
    Task<IEnumerable<Photo>> GetPreviewPhotosAsync(BaulId baulId, int limit);

    /// <summary>Active photos in a baúl, optionally scoped to one chapter, ordered chronologically
    /// ascending (dated photos by date, undated photos last, CreatedAt as the final tiebreaker) —
    /// used by the cover photo picker. Callers requesting take+1 can detect whether more pages
    /// remain without a separate count query.</summary>
    Task<IEnumerable<Photo>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take);

    /// <summary>Every photo in the baúl regardless of status (including soft-deleted) — used
    /// by the admin hard-delete flow, which needs to clear every row before the Baul can be
    /// deleted (Photo.BaulId is a Restrict FK).</summary>
    Task<IEnumerable<Photo>> GetAllByBaulIdAsync(BaulId baulId);

    /// <summary>Every active photo that already has a content hash — the candidate set the
    /// deduplicate-photos maintenance command groups by (BaulId, OriginalContentHash) to find
    /// duplicate groups.</summary>
    Task<IEnumerable<Photo>> GetActiveWithContentHashAsync();

    /// <summary>The active photo (if any) in this baúl already referencing this PhotoAsset —
    /// used by PhotoManager.AddToBaulAsync's app-level pre-check and to look up the survivor when
    /// TryAddExistingAssetAsync loses the race (see docs/.backlog issue #62, Slice 2). Never
    /// matches a soft-deleted photo.</summary>
    Task<Photo?> GetActiveByAssetIdAsync(BaulId baulId, PhotoAssetId assetId);

    Task CreateAsync(Photo photo);

    /// <summary>Inserts a new Active photo that references an already-existing PhotoAsset — the
    /// "Add to another baúl" write path (see Photo.CreateFromExistingAsset). Race-safe against
    /// the (BaulId, PhotoAssetId) partial-unique index the same way TryCreateActiveAsync is
    /// race-safe against (BaulId, OriginalContentHash): returns false, without throwing or
    /// persisting anything, if another active photo in the target baúl already references this
    /// asset. Never creates a PhotoAsset row — the caller is responsible for it already
    /// existing.</summary>
    Task<bool> TryAddExistingAssetAsync(Photo photo);

    Task UpdateAsync(Photo photo);
    Task DeleteAsync(PhotoId id);
    Task DeleteByBaulIdAsync(BaulId baulId);

    /// <summary>Every PhotoAsset this user has an explicit, currently-ACTIVE UserPhotoAsset
    /// relation to (Slice 2.5, docs/.backlog issue #62), regardless of which baúl(es) it
    /// currently appears in or whether the user still has access to any of them — the read
    /// model behind the user-scoped "Mis fotos" view. Never includes a soft-deleted relation
    /// (Slice 5 — "Quitar de Mis fotos"): a removed asset must disappear from every Mis fotos
    /// listing ("Todas", "Sin compartir", ...) even though its row survives for reactivation.
    /// Replaces the old PhotoAsset.UploadedBy-based lookup: that field only ever named the
    /// single user who happened to create the asset row, which breaks once two different users
    /// can each independently contribute the exact same bytes (see
    /// EnsureUserPhotoAssetActiveAsync).</summary>
    Task<IReadOnlyList<PhotoAsset>> GetByContributorAsync(UserId userId);

    /// <summary>A single PhotoAsset by id, with no Photo/baúl in the loop at all — used by
    /// PhotoManager.AddAssetToBaulAsync, which authorizes off the caller's own UserPhotoAsset
    /// relation instead of an accessible source Photo (see IPhotoManager's doc comment).</summary>
    Task<PhotoAsset?> GetAssetByIdAsync(PhotoAssetId id);

    /// <summary>The canonical PhotoAsset (if any) already carrying this exact content hash,
    /// regardless of baúl, user or Photo status — the global exact-duplicate lookup Slice 2.5
    /// (docs/.backlog issue #62) uses so a re-uploaded file reuses the existing asset instead of
    /// creating a new one. Never scoped to a baúl or a user: canonical identity is global (see
    /// PhotoAsset's doc comment), even though *access* to the asset never is.</summary>
    Task<PhotoAsset?> GetAssetByContentHashAsync(string originalContentHash);

    /// <summary>Inserts a new PhotoAsset row, honoring the global uniqueness that
    /// IX_PhotoAssets_OriginalContentHash enforces (a partial unique index over non-null
    /// hashes) — the database-level guard against two concurrent uploads of the same
    /// previously-unseen binary both minting their own canonical PhotoAsset. Returns false,
    /// without throwing or persisting anything, if another PhotoAsset already carries this
    /// hash; the caller is responsible for deleting whatever it already wrote to storage and
    /// falling back to the winning asset (see PhotoUploadWorkflow). A null OriginalContentHash
    /// never conflicts with anything.</summary>
    Task<bool> TryCreateAssetAsync(PhotoAsset asset);

    /// <summary>Whether this user already has an explicit, currently-ACTIVE UserPhotoAsset
    /// relation to this asset — used by PhotoManager.AddAssetToBaulAsync's authorization check
    /// (see its doc comment) instead of the old PhotoAsset.UploadedBy equality check. A
    /// soft-deleted relation (Slice 5) never counts: once removed from Mis fotos, the asset must
    /// be reactivated (SaveToMyPhotosAsync/EnsureUserPhotoAssetActiveAsync) before it can be
    /// distributed from Mis fotos again.</summary>
    Task<bool> HasUserPhotoAssetAsync(UserId userId, PhotoAssetId assetId);

    /// <summary>Idempotently ensures this user has this PhotoAsset ACTIVE in their personal
    /// photo space — race-safe via a unique (UserId, PhotoAssetId) constraint: an
    /// INSERT ... ON CONFLICT DO UPDATE that reactivates (clears DeletedAt on) an existing
    /// soft-deleted relation instead of ever inserting a second row for the same pair (Slice 5,
    /// docs/.backlog issue #62 — "Quitar de Mis fotos" and its reactivation, see
    /// UserPhotoAsset's own doc comment). AddedAt is only ever written on the original insert —
    /// reactivating an existing row leaves its AddedAt untouched, the simplest reading of
    /// "when this was first added" surviving a remove/re-add cycle. Returns false, without
    /// throwing, if the relation was already active (no write happened); either way the relation
    /// is guaranteed to be active once this returns.</summary>
    Task<bool> EnsureUserPhotoAssetActiveAsync(UserId userId, PhotoAssetId assetId, DateTime addedAt);

    /// <summary>Soft-deletes one user's own UserPhotoAsset relation — "Quitar de Mis fotos"
    /// (Slice 5, docs/.backlog issue #62). Scoped to (userId, assetId) by construction, so a
    /// caller can never reach another user's relation through this method regardless of what a
    /// client sends. Idempotent: a no-op if the relation doesn't exist or is already removed.
    /// Never touches the PhotoAsset itself, any Photo projection, or any other user's
    /// relation — see PhotoManager.RemoveFromMyPhotosAsync.</summary>
    Task SoftDeleteUserPhotoAssetAsync(UserId userId, PhotoAssetId assetId, DateTime deletedAt);

    /// <summary>Batch counterpart to SoftDeleteUserPhotoAssetAsync, for "Quitar de Mis fotos"
    /// over a multi-selection — one statement scoped to (userId, assetIds), so it can never
    /// affect a relation belonging to a different user no matter what ids the client sends (see
    /// PhotoManager.RemoveFromMyPhotosBatchAsync). Already-removed or unknown ids are silently
    /// ignored, same idempotent tolerance as the single-item version.</summary>
    Task SoftDeleteUserPhotoAssetsAsync(UserId userId, IEnumerable<PhotoAssetId> assetIds, DateTime deletedAt);

    /// <summary>Every active Photo referencing any of these assets, across every baúl — batched
    /// in one query instead of one per asset. Used by "Mis fotos" both to find each asset's
    /// originating Photo (for its intrinsic date) and to compute which baúles it appears in.</summary>
    Task<IReadOnlyList<Photo>> GetActiveByAssetIdsAsync(IEnumerable<PhotoAssetId> assetIds);

    /// <summary>Every PhotoAsset with zero referencing Photo rows (any status — a soft-deleted
    /// Photo still needs its asset's storage to render) and zero UserPhotoAsset relations,
    /// created before <paramref name="olderThan"/> — the true orphan set the cleanup-orphaned-
    /// photo-assets maintenance command (Slice 3, docs/.backlog issue #62) hard-deletes, both
    /// row and storage object. The age cutoff is a grace period, not correctness: it keeps this
    /// from racing an in-flight upload between minting the PhotoAsset row and the same
    /// transaction adding its Photo/UserPhotoAsset a moment later.</summary>
    Task<IReadOnlyList<PhotoAsset>> GetOrphanedAssetsAsync(DateTime olderThan);

    /// <summary>Hard-deletes a single PhotoAsset row — used only by the cleanup-orphaned-
    /// photo-assets maintenance command, once it has confirmed (via GetOrphanedAssetsAsync) that
    /// nothing still references it. Never called from any request-serving path.</summary>
    Task DeleteAssetAsync(PhotoAssetId id);

    /// <summary>Every PhotoAsset row, both canonical (non-null hash) and legacy/historical
    /// (null hash) — the starting point for the deduplicate-photo-assets maintenance command.
    /// IX_PhotoAssets_OriginalContentHash's uniqueness alone can't find historical duplicates:
    /// colliding legacy rows already lost their hash to migration
    /// 20260913154323_AddUserPhotoAssetsAndGlobalContentHash, so the command has to recompute
    /// content hashes from storage for every null-hash row before it can group them.</summary>
    Task<IReadOnlyList<PhotoAsset>> GetAllAssetsAsync();

    /// <summary>Every Photo referencing any of these assets, regardless of status — unlike
    /// GetActiveByAssetIdsAsync (Active-only), used by deduplicate-photo-assets to repoint every
    /// last reference (including soft-deleted photos) off a duplicate PhotoAsset before it's safe
    /// to delete the row: Photo.PhotoAssetId is a Restrict FK, so even a soft-deleted Photo still
    /// pointing at a duplicate would block its deletion.</summary>
    Task<IReadOnlyList<Photo>> GetAllByAssetIdsAsync(IEnumerable<PhotoAssetId> assetIds);

    /// <summary>Every UserPhotoAsset relation for any of these assets — used by
    /// deduplicate-photo-assets to find every (UserId, AddedAt) pair that needs redirecting/
    /// merging onto a duplicate group's canonical asset.</summary>
    Task<IReadOnlyList<UserPhotoAsset>> GetUserPhotoAssetsByAssetIdsAsync(IEnumerable<PhotoAssetId> assetIds);

    /// <summary>Repoints every listed Photo onto a different PhotoAsset in one statement, keeping
    /// each Photo's own denormalized OriginalContentHash column in lockstep with the new asset's
    /// trustworthy content hash (see Photo.OriginalContentHash's doc comment on why that copy
    /// exists at all) — used only by deduplicate-photo-assets, once it has confirmed (by merging
    /// any same-baúl active conflicts through PhotoDuplicateMergeService first) that no two of
    /// these photos will collide on IX_Photos_BaulId_PhotoAssetId_Active or
    /// IX_Photos_BaulId_OriginalContentHash_Active. Bypasses the change tracker
    /// (ExecuteUpdateAsync) like TryAddExistingAssetAsync's raw-SQL siblings — ordinary Update()
    /// would require loading and tracking every row first for what's otherwise a pure bulk
    /// column rewrite.</summary>
    Task RepointPhotoAssetIdAsync(IEnumerable<PhotoId> photoIds, PhotoAssetId newAssetId, string? newOriginalContentHash);

    /// <summary>Idempotently redirects one user's UserPhotoAsset relation onto a different
    /// (canonical) PhotoAsset, keeping the earliest AddedAt if the user already has a relation to
    /// that asset — used by deduplicate-photo-assets to collapse e.g. "Pedro → duplicate A" and
    /// "Pedro → duplicate B" into a single "Pedro → canonical" relation without violating the
    /// (UserId, PhotoAssetId) primary key. Native INSERT ... ON CONFLICT DO UPDATE, same
    /// rationale as TryCreateUserPhotoAssetAsync: always runs inside the caller's own
    /// transaction, where a caught DbUpdateException would poison it.</summary>
    Task RedirectUserPhotoAssetAsync(UserId userId, PhotoAssetId newAssetId, DateTime addedAt);

    /// <summary>Deletes a single UserPhotoAsset relation — used by deduplicate-photo-assets to
    /// remove a duplicate asset's relation once it has been merged onto the canonical asset via
    /// RedirectUserPhotoAssetAsync.</summary>
    Task DeleteUserPhotoAssetAsync(UserId userId, PhotoAssetId assetId);

    /// <summary>Sets a PhotoAsset's OriginalContentHash directly — used only by
    /// deduplicate-photo-assets to persist the freshly recomputed content hash onto a group's
    /// canonical asset when it was historically null. Never called from any request-serving
    /// path — PhotoAsset's own constructor is the only writer everywhere else.</summary>
    Task SetAssetContentHashAsync(PhotoAssetId id, string originalContentHash);
}
