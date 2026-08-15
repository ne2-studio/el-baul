using ElBaul.Core.Photos;
using ElBaul.Core.Recuerdos;

namespace ElBaul.Core.Feed;
// One card in the baúl feed for a single upload action — every photo sharing the same
// UploadBatchId. UserName/UserAvatar/PersonaId follow the same Persona-nickname authorship
// rule as RecuerdoDto (see docs/API-CONVENTIONS.md's "Display names"). PreviewPhotos carries
// at most 4 photos (oldest-first within the batch) for the feed card's collage; the full set
// is fetched separately via GET /baules/{baulId}/photo-batches/{batchId}/photos.
public record PhotoBatchDto(
    string BatchId,
    string UserId,
    string UserName,
    string? UserAvatar,
    string? PersonaId,
    int PhotoCount,
    string? ChapterId,
    string? ChapterName,
    DateTime CreatedAt,
    IReadOnlyList<PhotoDto> PreviewPhotos
);

// One card in the baúl feed announcing a chapter's creation. UserName/UserAvatar/PersonaId
// follow the same Persona-nickname authorship rule as RecuerdoDto/PhotoBatchDto (see
// docs/API-CONVENTIONS.md's "Display names").
public record ChapterCreatedFeedDto(
    string ChapterId,
    string Name,
    string? CoverPhotoUrl,
    DateTime CreatedAt,
    string UserId,
    string UserName,
    string? UserAvatar,
    string? PersonaId
);

// One entry in the baúl feed — a Recuerdo, a photo-upload batch, or a chapter-created event,
// never more than one. Type is "recuerdo"/"photo_batch"/"chapter_created"; CreatedAt is the
// entry's sort key, mirrored from whichever payload is populated so the feed can sort/serialize
// without unwrapping any of them. IsNew is computed per-request against the caller's own
// BaulFeedCursor (see BaulFeedManager.GetFeedAsync) — not part of the item's identity, just
// this response's framing of it.
public record FeedItemDto(
    string Type, DateTime CreatedAt, RecuerdoDto? Recuerdo, PhotoBatchDto? PhotoBatch,
    ChapterCreatedFeedDto? ChapterCreated = null, bool IsNew = false)
{
    public static FeedItemDto ForRecuerdo(RecuerdoDto recuerdo) => new("recuerdo", recuerdo.CreatedAt, recuerdo, null);
    public static FeedItemDto ForPhotoBatch(PhotoBatchDto photoBatch) => new("photo_batch", photoBatch.CreatedAt, null, photoBatch);
    public static FeedItemDto ForChapterCreated(ChapterCreatedFeedDto chapter) => new("chapter_created", chapter.CreatedAt, null, null, chapter);
}

// One page of the baúl feed, newest-first. Same "take+1 to detect more" shape as PhotoPageDto
// (PhotoManager.GetPageAsync) — callers requesting take+1 items can tell whether more remain
// without a separate count query. When skip is 0, the page is widened (never shrunk) to fit
// every item newer than the caller's BaulFeedCursor, so a visit with lots of new activity is
// never truncated mid-"new" — see BaulFeedManager.GetFeedAsync.
public record FeedPageDto(IReadOnlyList<FeedItemDto> Items, bool HasMore);
