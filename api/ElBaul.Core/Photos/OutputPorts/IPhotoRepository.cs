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

    /// <summary>Every PhotoAsset this user has an explicit UserPhotoAsset relation to (Slice
    /// 2.5, docs/.backlog issue #62), regardless of which baúl(es) it currently appears in or
    /// whether the user still has access to any of them — the read model behind the user-scoped
    /// "Mis fotos" view. Replaces the old PhotoAsset.UploadedBy-based lookup: that field only
    /// ever named the single user who happened to create the asset row, which breaks once two
    /// different users can each independently contribute the exact same bytes (see
    /// TryCreateUserPhotoAssetAsync).</summary>
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

    /// <summary>Whether this user already has an explicit UserPhotoAsset relation to this
    /// asset — used by PhotoManager.AddAssetToBaulAsync's authorization check (see its doc
    /// comment) instead of the old PhotoAsset.UploadedBy equality check.</summary>
    Task<bool> HasUserPhotoAssetAsync(UserId userId, PhotoAssetId assetId);

    /// <summary>Idempotently records that this user has this PhotoAsset in their personal photo
    /// space — race-safe via a unique (UserId, PhotoAssetId) constraint (ON CONFLICT DO
    /// NOTHING), same shape as TryCreateActiveAsync. Returns false, without throwing, if the
    /// relation already existed; either way the relation is guaranteed to exist once this
    /// returns.</summary>
    Task<bool> TryCreateUserPhotoAssetAsync(UserId userId, PhotoAssetId assetId, DateTime addedAt);

    /// <summary>Every active Photo referencing any of these assets, across every baúl — batched
    /// in one query instead of one per asset. Used by "Mis fotos" both to find each asset's
    /// originating Photo (for its intrinsic date) and to compute which baúles it appears in.</summary>
    Task<IReadOnlyList<Photo>> GetActiveByAssetIdsAsync(IEnumerable<PhotoAssetId> assetIds);
}
