namespace ElBaul.Ports.Input;

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

// One entry in the baúl feed — either a Recuerdo or a photo-upload batch, never both. Type is
// "recuerdo" or "photo_batch"; CreatedAt is the entry's sort key, mirrored from whichever of
// Recuerdo/PhotoBatch is populated so the feed can sort/serialize without unwrapping either.
public record FeedItemDto(string Type, DateTime CreatedAt, RecuerdoDto? Recuerdo, PhotoBatchDto? PhotoBatch)
{
    public static FeedItemDto ForRecuerdo(RecuerdoDto recuerdo) => new("recuerdo", recuerdo.CreatedAt, recuerdo, null);
    public static FeedItemDto ForPhotoBatch(PhotoBatchDto photoBatch) => new("photo_batch", photoBatch.CreatedAt, null, photoBatch);
}
