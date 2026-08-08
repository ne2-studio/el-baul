namespace ElBaul.Ports.Output;

/// <summary>
/// Read-only projection of photo-upload batches (photos sharing the same UploadBatchId) — the
/// baúl feed's "N fotos subidas" cards. Same "cross-repository read model" shape as
/// IPhotoListReadModel/IRecuerdoListReadModel: implementations bypass IPhotoRepository/
/// IChapterRepository on purpose to stitch together aggregate data by hand, one query (plus a
/// small batched chapter-name lookup) per listing regardless of how many batches it returns.
/// Family-archive scale (not big data), so grouping happens in memory rather than a SQL
/// GROUP BY — mirrors RecuerdoListReadModel's own "fetch then build" shape.
/// </summary>
public interface IPhotoUploadBatchReadModel
{
    /// <summary>Every upload batch in a baúl (active photos only), newest-first by the batch's
    /// earliest photo — used by the baúl feed.</summary>
    Task<IReadOnlyList<PhotoUploadBatchRow>> GetByBaulIdAsync(BaulId baulId);

    /// <summary>Every active photo in one specific batch, chronologically ascending — backs the
    /// batch's own grid/gallery (scoped navigation, same shape as a chapter's photo list).</summary>
    Task<IReadOnlyList<PhotoListRow>> GetPhotosByBatchIdAsync(BaulId baulId, Guid batchId);
}

public sealed record PhotoUploadBatchRow(
    Guid BatchId,
    string UploadedBy,
    ChapterId? ChapterId,
    string? ChapterName,
    DateTime CreatedAt,
    int PhotoCount,
    IReadOnlyList<PhotoListRow> PreviewPhotos
);

// Assembles PhotoUploadBatchRows from a flat list of active, batch-tagged photos — shared by
// PhotoUploadBatchReadModel (EF) and InMemoryPhotoUploadBatchReadModel (Lite) so the two can't
// drift on how a batch's CreatedAt/preview/count are derived.
public static class PhotoUploadBatchRowFactory
{
    private const int PreviewCount = 4;

    public static IReadOnlyList<PhotoUploadBatchRow> Build(
        IEnumerable<Photo> batchedPhotos, IReadOnlyDictionary<PhotoId, int> recuerdoCounts,
        IReadOnlyDictionary<ChapterId, string> chapterNamesById)
    {
        var rows = new List<PhotoUploadBatchRow>();
        foreach (var group in batchedPhotos.GroupBy(p => p.UploadBatchId!.Value))
        {
            var ordered = group.OrderBy(p => p.CreatedAt).ToList();
            // Every photo in a batch was uploaded to the same destination in one client action,
            // so chapter/uploader are read off the first photo rather than re-derived per row.
            var first = ordered[0];
            var previewRows = ordered.Take(PreviewCount)
                .Select(p => PhotoListRowFactory.Build(p, recuerdoCounts.GetValueOrDefault(p.Id)))
                .ToList();

            rows.Add(new PhotoUploadBatchRow(
                group.Key, first.UploadedBy, first.ChapterId,
                first.ChapterId is { } chapterId ? chapterNamesById.GetValueOrDefault(chapterId) : null,
                first.CreatedAt, ordered.Count, previewRows));
        }

        return rows.OrderByDescending(r => r.CreatedAt).ToList();
    }
}
