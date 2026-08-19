using ElBaul.Core.Photos.Domain;
namespace ElBaul.Core.Photos.OutputPorts;
// The canonical "how does El Baúl order photos" rule: dated photos first (oldest to newest),
// undated photos last, CreatedAt as the tiebreaker. Every photo listing (baúl-wide pages,
// persona photo feeds) must agree on this, so it lives here once instead of being
// re-implemented per call site.
//
// Two overloads exist rather than one, because the two LINQ providers need different shapes:
// the IQueryable<Photo> overload is built from Expression<Func<...>> so EF Core can translate
// it straight to SQL (it queries the mapped PhotoDate complex property); the IEnumerable<Photo> overload runs as compiled delegates over
// already-materialized photos. PhotoOrderingTests pins both to identical output.
public static class PhotoOrdering
{
    public static IOrderedQueryable<Photo> OrderByChronology(this IQueryable<Photo> photos) =>
        photos
            .OrderBy(p => p.TakenAt == null)
            .ThenBy(p => p.TakenAt == null ? (int?)null : p.TakenAt.Year)
            .ThenBy(p => p.TakenAt == null ? (int?)null : p.TakenAt.Month ?? 1)
            .ThenBy(p => p.TakenAt == null ? (int?)null : p.TakenAt.Day ?? 1)
            .ThenBy(p => p.CreatedAt);

    public static IOrderedEnumerable<Photo> OrderByChronology(this IEnumerable<Photo> photos) =>
        photos
            .OrderBy(p => p.TakenAt == null)
            .ThenBy(p => p.TakenAt?.Year)
            .ThenBy(p => p.TakenAt?.Month ?? 1)
            .ThenBy(p => p.TakenAt?.Day ?? 1)
            .ThenBy(p => p.CreatedAt);
}
