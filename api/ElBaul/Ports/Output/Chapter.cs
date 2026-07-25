namespace ElBaul.Ports.Output;

public record Chapter
(
    ChapterId Id,
    BaulId BaulId,
    string Name,
    int PhotoCount,
    string? CoverPhotoKey,
    DateTime CreatedAt,
    DateTime UpdatedAt
)
{
    // CoverPhotoKey follows the same rule everywhere a photo enters or leaves a chapter: the
    // first photo in becomes the cover, and only the current cover is ever cleared. WithPhotoAdded/
    // WithPhotoRemoved/WithCover are the sanctioned way to change it (mirrors Photo.WithDate/Create)
    // so that rule lives in one place instead of being reconstructed inline per call site.
    public Chapter WithPhotoAdded(Photo photo, DateTime updatedAt) =>
        this with
        {
            PhotoCount = PhotoCount + 1,
            CoverPhotoKey = string.IsNullOrEmpty(CoverPhotoKey) ? photo.StorageKey : CoverPhotoKey,
            UpdatedAt = updatedAt
        };

    public Chapter WithPhotoRemoved(Photo photo, DateTime updatedAt) =>
        this with
        {
            PhotoCount = Math.Max(0, PhotoCount - 1),
            CoverPhotoKey = CoverPhotoKey == photo.StorageKey ? null : CoverPhotoKey,
            UpdatedAt = updatedAt
        };

    public Chapter WithCover(Photo photo, DateTime updatedAt) =>
        this with { CoverPhotoKey = photo.StorageKey, UpdatedAt = updatedAt };
}
