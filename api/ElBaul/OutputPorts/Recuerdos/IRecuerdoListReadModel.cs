using ElBaul.OutputPorts.Shared;
namespace ElBaul.OutputPorts.Recuerdos;
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
    string UserId,
    string Text,
    DateTime CreatedAt,
    string? PhotoStorageKey,
    string? ChapterName
);

// Assembles a batch of IRecuerdoListReadModel rows from already-fetched recuerdos plus
// already-batched photo-storage-key/chapter-name lookups. Shared by RecuerdoListReadModel (EF)
// and InMemoryRecuerdoListReadModel (Lite) so the two can't drift on how a row gets built.
public static class RecuerdoListRowFactory
{
    public static IReadOnlyList<RecuerdoListRow> Build(
        IReadOnlyCollection<Recuerdo> recuerdos,
        IReadOnlyDictionary<PhotoId, string> photoStorageKeysById,
        IReadOnlyDictionary<ChapterId, string> chapterNamesById) =>
        recuerdos.Select(r => new RecuerdoListRow(
            r.Id, r.PhotoId, r.ChapterId, r.BaulId, r.UserId, r.Text, r.CreatedAt,
            r.PhotoId is { } photoId ? photoStorageKeysById.GetValueOrDefault(photoId) : null,
            r.ChapterId is { } chapterId ? chapterNamesById.GetValueOrDefault(chapterId) : null))
        .ToList();
}
