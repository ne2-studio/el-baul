using ElBaul.OutputPorts.Shared;
using ElBaul.Domain;
namespace ElBaul.OutputPorts.Chapters;
/// <summary>
/// Read-only projection of a baúl's chapters for listing — recuerdo count, latest recuerdo, and
/// photo date range, computed directly against storage instead of the one-repository-round-trip
/// -per-chapter ChapterManager.GetByBaulIdAsync used to run (photos + recuerdos + an author
/// lookup, per chapter — an N+1 for a baúl with N chapters). Implementations bypass
/// IChapterRepository/IPhotoRepository/IRecuerdoRepository's per-chapter methods on purpose —
/// same "cross-repository read model, not an aggregate" exception as IAdminRepository (see
/// AdminRepository.cs), just scoped to one baúl instead of unscoped. ChapterManager still
/// resolves cover/featured-cover URLs and the latest author's display identity itself
/// (IPhotoStorage/AuthorInfoProjector aren't persistence concerns this read model owns).
/// </summary>
public interface IChapterListReadModel
{
    Task<IReadOnlyList<ChapterListRow>> GetByBaulIdAsync(BaulId baulId);
}

public sealed record ChapterListRow(
    ChapterId Id,
    BaulId BaulId,
    string Name,
    int PhotoCount,
    string? CoverPhotoKey,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int RecuerdoCount,
    string? LatestRecuerdoText,
    UserId? LatestRecuerdoAuthorUserId,
    ChapterDateRange DateRange
);
