using ElBaul.Domain;
namespace ElBaul.OutputPorts.Photos;
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
    Task<IEnumerable<Photo>> GetUndatedAsync();

    /// <summary>Photos with no recorded size yet (SizeBytes == 0 — the default for rows created
    /// before this field existed) — used by the backfill-photo-size-bytes maintenance command.
    /// Not status-filtered: soft-deleted photos keep their storage blob (see
    /// PhotoLifecycleService) and their size still counts toward the admin baúl-size total.</summary>
    Task<IEnumerable<Photo>> GetMissingSizeBytesAsync();

    /// <summary>Photos with no recorded dimensions yet (Width == 0 — the default for rows
    /// created before this field existed) — used by the backfill-photo-metadata maintenance
    /// command. Not status-filtered, same rationale as GetMissingSizeBytesAsync.</summary>
    Task<IEnumerable<Photo>> GetMissingDimensionsAsync();

    /// <summary>Photos whose recorded dimensions currently violate ImagePolicy's
    /// MaxStoredLongEdge — used by the backfill-normalize-photos maintenance command to find
    /// normalization candidates. Filtered by the *recorded* Width/Height, not SizeBytes — the
    /// command itself re-checks the actual stored asset before normalizing, since a row backfilled
    /// via backfill-photo-metadata is the source of truth this depends on. Not status-filtered,
    /// same rationale as GetMissingSizeBytesAsync.</summary>
    Task<IEnumerable<Photo>> GetOversizedAsync(int maxLongEdge);

    /// <summary>Active photos with no UploadBatchId yet (rows created before the field existed),
    /// ordered by BaulId/ChapterId/UploadedBy/CreatedAt — the exact order
    /// backfill-upload-batch-id groups by. Not status-filtered beyond Active: a batch is a feed
    /// concept, and the feed never shows soft-deleted photos anyway.</summary>
    Task<IEnumerable<Photo>> GetMissingUploadBatchIdAsync();

    /// <summary>Active photos in a baúl, optionally scoped to one chapter, ordered chronologically
    /// ascending (dated photos by date, undated photos last, CreatedAt as the final tiebreaker) —
    /// used by the cover photo picker. Callers requesting take+1 can detect whether more pages
    /// remain without a separate count query.</summary>
    Task<IEnumerable<Photo>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take);

    /// <summary>Every photo in the baúl regardless of status (including soft-deleted) — used
    /// by the admin hard-delete flow, which needs to clear every row before the Baul can be
    /// deleted (Photo.BaulId is a Restrict FK).</summary>
    Task<IEnumerable<Photo>> GetAllByBaulIdAsync(BaulId baulId);

    /// <summary>The active photo (if any) in this baúl already carrying this content hash —
    /// used by PhotoUploadWorkflow's app-level duplicate check and by the merge/backfill flows
    /// to look up the survivor of a race they lost. Never matches a soft-deleted duplicate.</summary>
    Task<Photo?> GetActiveByContentHashAsync(BaulId baulId, string originalContentHash);

    /// <summary>Photos with no OriginalContentHash yet, regardless of status — used by the
    /// backfill-photo-content-hashes maintenance command. Not status-filtered, same rationale as
    /// GetMissingSizeBytesAsync: a soft-deleted photo's blob is never removed either, so it's
    /// just as hashable, and doing so costs nothing extra since the uniqueness constraint only
    /// ever applies to Active rows.</summary>
    Task<IEnumerable<Photo>> GetMissingContentHashAsync();

    /// <summary>Every active photo that already has a content hash — the candidate set the
    /// deduplicate-photos maintenance command groups by (BaulId, OriginalContentHash) to find
    /// duplicate groups.</summary>
    Task<IEnumerable<Photo>> GetActiveWithContentHashAsync();

    Task CreateAsync(Photo photo);

    /// <summary>Inserts a new Active photo, honoring the same (BaulId, OriginalContentHash)
    /// uniqueness that IX_Photos_BaulId_OriginalContentHash_Active enforces (or, until that
    /// migration has been applied, an application-level equivalent of it) — the final
    /// concurrency guard against two uploads of the same exact file racing each other. Returns
    /// false, without throwing and without persisting anything, if another Active photo in the
    /// same baúl already carries this hash; the caller is responsible for treating that as a
    /// duplicate (see PhotoUploadWorkflow.CreatePhotoAsync). A null/OriginalContentHash never
    /// conflicts with anything, so this is safe to use unconditionally for every photo
    /// insert.</summary>
    Task<bool> TryCreateActiveAsync(Photo photo);

    /// <summary>Sets OriginalContentHash on an existing photo, honoring the same uniqueness
    /// as TryCreateActiveAsync when the photo being updated is Active. Returns false, without
    /// writing anything, if another Active photo in the same baúl already carries this hash —
    /// used by backfill-photo-content-hashes to detect a pre-existing, previously-unflagged
    /// duplicate pair instead of corrupting the constraint. A Deleted photo can never conflict
    /// (the constraint only covers Active rows), so this always succeeds for one.</summary>
    Task<bool> TrySetContentHashAsync(PhotoId photoId, BaulId baulId, string originalContentHash);

    Task UpdateAsync(Photo photo);
    Task DeleteAsync(PhotoId id);
    Task DeleteByBaulIdAsync(BaulId baulId);
}
