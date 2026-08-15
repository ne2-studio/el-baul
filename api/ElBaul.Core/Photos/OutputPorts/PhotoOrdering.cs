namespace ElBaul.Core.Photos.OutputPorts;
// The canonical "how does El Baúl order photos" rule: dated photos first (oldest to newest),
// undated photos last, CreatedAt as the tiebreaker. Every photo listing (baúl-wide pages,
// persona photo feeds) must agree on this, so it lives here once instead of being
// re-implemented per call site.
//
// Two overloads exist rather than one, because the two LINQ providers need different shapes:
// the IQueryable<Photo> overload is built from Expression<Func<...>> so EF Core can translate
// it straight to SQL (it queries the raw DateYear/Month/Day columns since Photo.Date isn't
// part of the EF model); the IEnumerable<Photo> overload runs as compiled delegates over
// already-materialized photos. PhotoOrderingTests pins both to identical output.
public static class PhotoOrdering
{
    public static IOrderedQueryable<Photo> OrderByChronology(this IQueryable<Photo> photos) =>
        photos
            .OrderBy(p => p.DateYear == null)
            .ThenBy(p => p.DateYear)
            .ThenBy(p => p.DateMonth ?? 1)
            .ThenBy(p => p.DateDay ?? 1)
            .ThenBy(p => p.CreatedAt);

    public static IOrderedEnumerable<Photo> OrderByChronology(this IEnumerable<Photo> photos) =>
        photos
            .OrderBy(p => p.DateYear == null)
            .ThenBy(p => p.DateYear)
            .ThenBy(p => p.DateMonth ?? 1)
            .ThenBy(p => p.DateDay ?? 1)
            .ThenBy(p => p.CreatedAt);
}
