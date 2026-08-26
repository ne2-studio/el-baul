using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Recuerdos.Domain;
using ElBaul.Domain;
namespace ElBaul.Core.Recuerdos.OutputPorts;
/// <summary>
/// Read-only projection of recuerdo feed rows (a baúl's whole wall, one chapter's, one photo's)
/// — each row already carries its photo's storage key (for the thumbnail) and its chapter's
/// name, batched instead of RecuerdoManager fetching Photos/Chapters by hand per listing.
/// Implementations bypass IRecuerdoRepository/IPhotoRepository/IChapterRepository on purpose —
/// same "cross-repository read model" shape as IChapterListReadModel/IPhotoListReadModel,
/// applied here even though the feed was never N+1: it's still one manager stitching together
/// three repositories' worth of aggregate data by hand for every listing. RecuerdoManager still
/// resolves thumbnail URLs (IPhotoStorage) and author identity (AuthorInfoProjector) itself —
/// neither is a persistence concern this read model owns.
/// </summary>
public interface IRecuerdoListReadModel
{
    /// <summary>Every recuerdo in a baúl — photo-attached, chapter-attached, and standalone —
    /// newest first (mirrors IRecuerdoRepository.GetByBaulIdAsync).</summary>
    Task<IReadOnlyList<RecuerdoListRow>> GetByBaulIdAsync(BaulId baulId);

    /// <summary>A chapter's recuerdos, newest first (mirrors
    /// IRecuerdoRepository.GetByChapterIdAsync).</summary>
    Task<IReadOnlyList<RecuerdoListRow>> GetByChapterIdAsync(ChapterId chapterId);

    /// <summary>A photo's recuerdos, oldest first (mirrors
    /// IRecuerdoRepository.GetByPhotoIdAsync).</summary>
    Task<IReadOnlyList<RecuerdoListRow>> GetByPhotoIdAsync(PhotoId photoId);
}

public sealed record RecuerdoListRow(
    RecuerdoId Id,
    PhotoId? PhotoId,
    ChapterId? ChapterId,
    BaulId BaulId,
    UserId UserId,
    string Text,
    DateTime CreatedAt,
    string? PhotoStorageKey,
    string? ChapterName
);

// Assembles a batch of IRecuerdoListReadModel rows from already-fetched recuerdos plus
// already-batched photos/chapter-name lookups. Shared by RecuerdoListReadModel (EF) and
// InMemoryRecuerdoListReadModel (Lite) so the two can't drift on how a row gets built.
public static class RecuerdoListRowFactory
{
    public static IReadOnlyList<RecuerdoListRow> Build(
        IReadOnlyCollection<Recuerdo> recuerdos,
        IReadOnlyDictionary<PhotoId, Photo> photosById,
        IReadOnlyDictionary<ChapterId, string> chapterNamesById) =>
        recuerdos.Select(r =>
        {
            var photo = r.PhotoId is { } photoId ? photosById.GetValueOrDefault(photoId) : null;

            // A photo-scoped recuerdo's chapter is resolved live from the photo's *current*
            // chapter, not the recuerdo's own persisted ChapterId snapshot — the photo may have
            // been moved to a different chapter (or out of any chapter) since the recuerdo was
            // written. A chapter-scoped recuerdo has no photo to resolve from, so its own
            // ChapterId stays authoritative. See #60.
            var effectiveChapterId = r.PhotoId is not null ? photo?.ChapterId : r.ChapterId;

            return new RecuerdoListRow(
                r.Id, r.PhotoId, effectiveChapterId, r.BaulId, r.UserId, r.Text, r.CreatedAt,
                photo?.StorageKey,
                effectiveChapterId is { } chapterId ? chapterNamesById.GetValueOrDefault(chapterId) : null);
        })
        .ToList();
}
