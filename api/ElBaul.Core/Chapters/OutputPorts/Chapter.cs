using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Core.Chapters.OutputPorts;
public record Chapter
(
    ChapterId Id,
    BaulId BaulId,
    string Name,
    int PhotoCount,
    // Legacy, no longer written by any domain code — kept only so a backfill can still read it
    // to populate CoverPhotoId below (see backfill-baul-chapter-cover-photo-id) and so it isn't
    // silently dropped from rows that predate CoverPhotoId. Every read path goes through
    // CoverPhotoId + CoverUrlResolver instead; do not add a new consumer of this field.
    string? CoverPhotoKey,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    // "" for chapters created before this field existed — never matches a real user id, so
    // legacy chapters are simply never excluded as "your own" (e.g. from the weekly digest).
    string CreatedByUserId = "",
    decimal CoverCropX = 0.5m,
    decimal CoverCropY = 0.5m,
    decimal CoverCropScale = 1m,
    PhotoId? CoverPhotoId = null
)
{
    // CoverPhotoId follows the same rule everywhere a photo enters or leaves a chapter: the
    // first photo in becomes the cover, and only the current cover is ever cleared. WithPhotoAdded/
    // WithPhotoRemoved/WithCover are the sanctioned way to change it (mirrors Photo.WithDate/Create)
    // so that rule lives in one place instead of being reconstructed inline per call site.
    public Chapter WithPhotoAdded(PhotoRef photo, DateTime updatedAt) =>
        this with
        {
            PhotoCount = PhotoCount + 1,
            CoverPhotoId = CoverPhotoId is null ? photo.Id : CoverPhotoId,
            UpdatedAt = updatedAt
        };

    public Chapter WithPhotoRemoved(PhotoRef photo, DateTime updatedAt) =>
        this with
        {
            PhotoCount = Math.Max(0, PhotoCount - 1),
            CoverPhotoId = CoverPhotoId == photo.Id ? null : CoverPhotoId,
            UpdatedAt = updatedAt
        };

    // Redirects the cover to a different photo without touching the existing crop — unlike
    // WithCover, which is the user-initiated "pick a new cover" action and resets crop to
    // whatever the picker submitted. Used by PhotoDuplicateMergeService: when the duplicate
    // being merged away is the current cover, the survivor's own (bit-identical) blob takes over
    // the same framing rather than resetting it to center.
    public Chapter WithCoverPhotoId(PhotoId coverPhotoId, DateTime updatedAt) =>
        this with { CoverPhotoId = coverPhotoId, UpdatedAt = updatedAt };

    public Chapter WithName(string name, DateTime updatedAt) =>
        this with { Name = name, UpdatedAt = updatedAt };

    public Chapter WithCover(Photo photo, decimal cropX, decimal cropY, decimal cropScale, DateTime updatedAt) =>
        this with
        {
            CoverPhotoId = photo.Id,
            CoverCropX = cropX,
            CoverCropY = cropY,
            CoverCropScale = cropScale,
            UpdatedAt = updatedAt
        };
}
