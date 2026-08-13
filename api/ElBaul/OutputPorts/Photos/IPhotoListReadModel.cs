using ElBaul.Domain;
namespace ElBaul.OutputPorts.Photos;
/// <summary>
/// Read-only projection of photo listing rows (chapter grid, loose photos, the paginated baúl
/// grid, a persona's tagged photos) — each row already carries its recuerdo count, batched
/// instead of a separate per-listing IRecuerdoRepository.GetByPhotoIdsAsync call. Implementations
/// bypass IPhotoRepository/IRecuerdoRepository on purpose — same "cross-repository read model"
/// shape as IChapterListReadModel/IAdminRepository, applied to the app's highest-traffic
/// listing (the photo grid) even though it was never N+1 to begin with: it's still one manager
/// stitching together two repositories' worth of aggregate data by hand for every listing.
/// PhotoManager still resolves thumbnail/full URLs itself (IPhotoStorage isn't a persistence
/// concern this read model owns).
/// </summary>
public interface IPhotoListReadModel
{
    Task<IReadOnlyList<PhotoListRow>> GetByChapterIdAsync(ChapterId chapterId);
    Task<IReadOnlyList<PhotoListRow>> GetLooseByBaulIdAsync(BaulId baulId);
    Task<IReadOnlyList<PhotoListRow>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take);

    /// <summary>Active photos in a baúl among the given ids, chronologically ordered — the
    /// exact shape PhotoManager.GetByPersonaIdAsync needs for a persona's tagged photos once
    /// IPhotoPersonaTagRepository has resolved which photo ids to look up.</summary>
    Task<IReadOnlyList<PhotoListRow>> GetActiveByIdsAsync(BaulId baulId, IEnumerable<PhotoId> photoIds);

    /// <summary>A random active photo in a baúl with no persona tagged on it yet and not
    /// explicitly confirmed as having nobody in it, or null if none remain — backs the "help us
    /// tag this photo" contribution suggestion shown on entering a baúl's feed. Random rather
    /// than oldest-first so the suggestion varies between visits instead of always landing on
    /// the same photo.</summary>
    Task<PhotoListRow?> GetUntaggedSuggestionAsync(BaulId baulId);
}

public sealed record PhotoListRow(
    PhotoId Id,
    ChapterId? ChapterId,
    BaulId BaulId,
    string StorageKey,
    int? DateYear,
    int? DateMonth,
    int? DateDay,
    UserId UploadedBy,
    DateTime CreatedAt,
    int RecuerdoCount
);

// Assembles one IPhotoListReadModel row from a Photo and its already-batched recuerdo count.
// Shared by PhotoListReadModel (EF) and InMemoryPhotoListReadModel (Lite) so the two can't
// drift on which Photo fields make it into the row.
public static class PhotoListRowFactory
{
    public static PhotoListRow Build(Photo photo, int recuerdoCount) =>
        new(photo.Id, photo.ChapterId, photo.BaulId, photo.StorageKey,
            photo.DateYear, photo.DateMonth, photo.DateDay, photo.UploadedBy, photo.CreatedAt, recuerdoCount);
}
