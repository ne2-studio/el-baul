using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Core.Chapters.OutputPorts;
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
    string CreatedByUserId = "",
    decimal CoverCropX = 0.5m,
    decimal CoverCropY = 0.5m,
    decimal CoverCropScale = 1m
)
{
    // CoverPhotoKey follows the same rule everywhere a photo enters or leaves a chapter: the
    // first photo in becomes the cover, and only the current cover is ever cleared. WithPhotoAdded/
    // WithPhotoRemoved/WithCover are the sanctioned way to change it (mirrors Photo.WithDate/Create)
    // so that rule lives in one place instead of being reconstructed inline per call site.
    public Chapter WithPhotoAdded(PhotoRef photo, DateTime updatedAt) =>
        this with
        {
            PhotoCount = PhotoCount + 1,
            CoverPhotoKey = string.IsNullOrEmpty(CoverPhotoKey) ? photo.StorageKey : CoverPhotoKey,
            UpdatedAt = updatedAt
        };

    public Chapter WithPhotoRemoved(PhotoRef photo, DateTime updatedAt) =>
        this with
        {
            PhotoCount = Math.Max(0, PhotoCount - 1),
            CoverPhotoKey = CoverPhotoKey == photo.StorageKey ? null : CoverPhotoKey,
            UpdatedAt = updatedAt
        };

    // Redirects the cover to a different photo's storage key without touching the existing crop
    // — unlike WithCover, which is the user-initiated "pick a new cover" action and resets crop
    // to whatever the picker submitted. Used by PhotoDuplicateMergeService: when the duplicate
    // being merged away is the current cover, the survivor's own (bit-identical) blob takes over
    // the same framing rather than resetting it to center.
    public Chapter WithCoverPhotoKey(string coverPhotoKey, DateTime updatedAt) =>
        this with { CoverPhotoKey = coverPhotoKey, UpdatedAt = updatedAt };

    public Chapter WithName(string name, DateTime updatedAt) =>
        this with { Name = name, UpdatedAt = updatedAt };

    public Chapter WithCover(Photo photo, decimal cropX, decimal cropY, decimal cropScale, DateTime updatedAt) =>
        this with
        {
            CoverPhotoKey = photo.StorageKey,
            CoverCropX = cropX,
            CoverCropY = cropY,
            CoverCropScale = cropScale,
            UpdatedAt = updatedAt
        };
}
