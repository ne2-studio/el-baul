namespace ElBaul.Ports.Output;

public interface IPhotoRepository
{
    Task<Photo?> GetByIdAsync(PhotoId id);
    Task<IEnumerable<Photo>> GetByIdsAsync(IEnumerable<PhotoId> ids);
    Task<Photo?> GetByClientUploadIdAsync(Guid clientUploadId);
    Task<IEnumerable<Photo>> GetByChapterIdAsync(ChapterId chapterId);
    Task<IEnumerable<Photo>> GetLooseByBaulIdAsync(BaulId baulId);
    Task<IEnumerable<Photo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since);
    Task<IEnumerable<Photo>> GetPreviewPhotosAsync(BaulId baulId, int limit);
    Task<IEnumerable<Photo>> GetUndatedAsync();

    /// <summary>Photos with no recorded size yet (SizeBytes == 0 — the default for rows created
    /// before this field existed) — used by the backfill-photo-size-bytes maintenance command.
    /// Not status-filtered: soft-deleted photos keep their storage blob (see
    /// PhotoLifecycleService) and their size still counts toward the admin baúl-size total.</summary>
    Task<IEnumerable<Photo>> GetMissingSizeBytesAsync();

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
