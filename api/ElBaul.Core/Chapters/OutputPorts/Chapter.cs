using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Core.Chapters.OutputPorts;
public sealed class Chapter : Entity<ChapterId>
{
    public BaulId BaulId { get; private set; }
    public string Name { get; private set; }
    public int PhotoCount { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public string CreatedByUserId { get; private set; }
    public decimal CoverCropX { get; private set; }
    public decimal CoverCropY { get; private set; }
    public decimal CoverCropScale { get; private set; }
    public PhotoId? CoverPhotoId { get; private set; }

    public Chapter(
    ChapterId Id,
    BaulId BaulId,
    string Name,
    int PhotoCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    // "" for chapters created before this field existed — never matches a real user id, so
    // legacy chapters are simply never excluded as "your own" (e.g. from the weekly digest).
    string CreatedByUserId = "",
    decimal CoverCropX = 0.5m,
    decimal CoverCropY = 0.5m,
    decimal CoverCropScale = 1m,
    PhotoId? CoverPhotoId = null) : base(Id)
    {
        this.BaulId = BaulId; this.Name = Name; this.PhotoCount = PhotoCount; this.CreatedAt = CreatedAt;
        this.UpdatedAt = UpdatedAt; this.CreatedByUserId = CreatedByUserId; this.CoverCropX = CoverCropX;
        this.CoverCropY = CoverCropY; this.CoverCropScale = CoverCropScale; this.CoverPhotoId = CoverPhotoId;
    }
    // CoverPhotoId follows the same rule everywhere a photo enters or leaves a chapter: the
    // first photo in becomes the cover, and only the current cover is ever cleared. WithPhotoAdded/
    // WithPhotoRemoved/WithCover are the sanctioned way to change it (mirrors Photo.WithDate/Create)
    // so that rule lives in one place instead of being reconstructed inline per call site.
    public Chapter WithPhotoAdded(PhotoRef photo, DateTime updatedAt) =>
        Mutate(() => { PhotoCount++; CoverPhotoId ??= photo.Id; UpdatedAt = updatedAt; });

    public Chapter WithPhotoRemoved(PhotoRef photo, DateTime updatedAt) =>
        Mutate(() => { PhotoCount = Math.Max(0, PhotoCount - 1); if (CoverPhotoId == photo.Id) CoverPhotoId = null; UpdatedAt = updatedAt; });

    // Redirects the cover to a different photo without touching the existing crop — unlike
    // WithCover, which is the user-initiated "pick a new cover" action and resets crop to
    // whatever the picker submitted. Used by PhotoDuplicateMergeService: when the duplicate
    // being merged away is the current cover, the survivor's own (bit-identical) blob takes over
    // the same framing rather than resetting it to center.
    public Chapter WithCoverPhotoId(PhotoId coverPhotoId, DateTime updatedAt) =>
        Mutate(() => { CoverPhotoId = coverPhotoId; UpdatedAt = updatedAt; });

    public Chapter WithName(string name, DateTime updatedAt) =>
        Mutate(() => { Name = name; UpdatedAt = updatedAt; });

    public Chapter WithCover(Photo photo, decimal cropX, decimal cropY, decimal cropScale, DateTime updatedAt) =>
        Mutate(() => { CoverPhotoId = photo.Id; CoverCropX = cropX; CoverCropY = cropY; CoverCropScale = cropScale; UpdatedAt = updatedAt; });

    private Chapter Mutate(Action action) { action(); return this; }
}
