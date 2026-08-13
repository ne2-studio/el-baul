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

    Task CreateAsync(Photo photo);
    Task UpdateAsync(Photo photo);
    Task DeleteAsync(PhotoId id);
    Task DeleteByBaulIdAsync(BaulId baulId);
}
