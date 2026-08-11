using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using ElBaul.Domain;
namespace ElBaul.OutputPorts.Chapters;
public record Chapter
(
    ChapterId Id,
    BaulId BaulId,
    string Name,
    int PhotoCount,
    string? CoverPhotoKey,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    // "" for chapters created before this field existed — never matches a real user id, so
    // legacy chapters are simply never excluded as "your own" (e.g. from the weekly digest).
    string CreatedByUserId = ""
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

    public Chapter WithName(string name, DateTime updatedAt) =>
        this with { Name = name, UpdatedAt = updatedAt };

    public Chapter WithCover(Photo photo, DateTime updatedAt) =>
        this with { CoverPhotoKey = photo.StorageKey, UpdatedAt = updatedAt };
}
