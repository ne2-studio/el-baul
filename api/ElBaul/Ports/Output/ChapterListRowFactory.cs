namespace ElBaul.Ports.Output;

/// <summary>Min/max photo date (year/month/day, nullable per precision) plus a count of undated
/// photos — the shape ChapterDto's MinDate*/MaxDate*/UndatedPhotoCount fields come from.</summary>
public readonly record struct ChapterDateRange(
    int? MinYear, int? MinMonth, int? MinDay,
    int? MaxYear, int? MaxMonth, int? MaxDay,
    int UndatedPhotoCount)
{
    public static readonly ChapterDateRange Empty = new(null, null, null, null, null, null, 0);
}

// The canonical "how does a chapter's photo date range get computed" rule: among a chapter's
// dated photos, the earliest and latest by (Year, Month ?? 1, Day ?? 1); undated photos count
// but don't affect the range. Shared by ChapterManager's single-chapter paths (Create/Update/
// SetCover/Delete) and ChapterListRowFactory below, so the two can't drift the way PhotoOrdering's
// two overloads are split to prevent (see PhotoOrdering.cs) — this one only ever runs over
// already-materialized photos, so a single IEnumerable overload is enough.
public static class ChapterDateRangeCalculator
{
    public static ChapterDateRange Compute(IReadOnlyCollection<Photo> photos)
    {
        var dated = photos.Where(p => p.Date is not null).ToList();
        var undatedCount = photos.Count - dated.Count;
        if (dated.Count == 0) return ChapterDateRange.Empty with { UndatedPhotoCount = undatedCount };

        var min = dated.OrderBy(p => p.Date!.Year).ThenBy(p => p.Date!.Month ?? 1).ThenBy(p => p.Date!.Day ?? 1).First();
        var max = dated.OrderByDescending(p => p.Date!.Year).ThenByDescending(p => p.Date!.Month ?? 1).ThenByDescending(p => p.Date!.Day ?? 1).First();

        return new ChapterDateRange(
            min.Date!.Year, min.Date!.Month, min.Date!.Day,
            max.Date!.Year, max.Date!.Month, max.Date!.Day, undatedCount);
    }
}

// Assembles one IChapterListReadModel row from a chapter and its already-materialized photos/
// recuerdos. Shared by ChapterListReadModel (EF) and InMemoryChapterListReadModel (Lite) so the
// two LINQ providers — one querying ElBaulDbContext directly, one reading the in-memory
// InMemory*Repository stores — can only ever differ in how they fetch the rows, never in how a
// row gets built from them.
public static class ChapterListRowFactory
{
    public static ChapterListRow Build(Chapter chapter, IReadOnlyCollection<Photo> photos, IReadOnlyCollection<Recuerdo> recuerdos)
    {
        var latest = recuerdos.OrderByDescending(r => r.CreatedAt).FirstOrDefault();
        return new ChapterListRow(
            chapter.Id, chapter.BaulId, chapter.Name, chapter.PhotoCount, chapter.CoverPhotoKey,
            chapter.CreatedAt, chapter.UpdatedAt, recuerdos.Count, latest?.Text, latest?.UserId,
            ChapterDateRangeCalculator.Compute(photos));
    }
}
