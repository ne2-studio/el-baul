using ElBaul.Core.Photos.Domain;
using ElBaul.Domain;
namespace ElBaul.Core.Chapters.Domain;
public sealed class Chapter : Entity<ChapterId>
{
    private Chapter() : base(default!)
    {
        Name = null!;
        CreatedByUserId = null!;
        CoverCrop = ImageCrop.DefaultCoverCrop;
    }

    public BaulId BaulId { get; private set; }
    public string Name { get; private set; }
    public int PhotoCount { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public string CreatedByUserId { get; private set; }
    public ImageCrop CoverCrop { get; private set; }
    public PhotoId? CoverPhotoId { get; private set; }

    public Chapter(
    ChapterId Id,
    BaulId BaulId,
    string Name,
    int PhotoCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    ImageCrop CoverCrop,
    // "" for chapters created before this field existed — never matches a real user id, so
    // legacy chapters are simply never excluded as "your own" (e.g. from the weekly digest).
    string CreatedByUserId = "",
    PhotoId? CoverPhotoId = null) : base(Id)
    {
        this.BaulId = BaulId; this.Name = Name; this.PhotoCount = PhotoCount; this.CreatedAt = CreatedAt;
        this.UpdatedAt = UpdatedAt; this.CreatedByUserId = CreatedByUserId; this.CoverCrop = CoverCrop;
        this.CoverPhotoId = CoverPhotoId;
    }

    public Chapter(
        ChapterId Id, BaulId BaulId, string Name, int PhotoCount, DateTime CreatedAt, DateTime UpdatedAt,
        string CreatedByUserId = "", decimal CoverCropX = 0.5m, decimal CoverCropY = 0.5m,
        decimal CoverCropScale = 1m, PhotoId? CoverPhotoId = null)
        : this(Id, BaulId, Name, PhotoCount, CreatedAt, UpdatedAt,
            new ImageCrop(CoverCropX, CoverCropY, CoverCropScale), CreatedByUserId, CoverPhotoId)
    {
    }
    // CoverPhotoId follows the same rule everywhere a photo enters or leaves a chapter: the
    // first photo in becomes the cover, and only the current cover is ever cleared. WithPhotoAdded/
    // WithPhotoRemoved/WithCover are the sanctioned way to change it (mirrors Photo.WithDate/Create)
    // so that rule lives in one place instead of being reconstructed inline per call site.
    public Chapter WithPhotoAdded(PhotoId photoId, DateTime updatedAt) =>
        Mutate(() => { PhotoCount++; CoverPhotoId ??= photoId; UpdatedAt = updatedAt; });

    public Chapter WithPhotoRemoved(PhotoId photoId, DateTime updatedAt) =>
        Mutate(() => { PhotoCount = Math.Max(0, PhotoCount - 1); if (CoverPhotoId == photoId) CoverPhotoId = null; UpdatedAt = updatedAt; });

    // Redirects the cover to a different photo without touching the existing crop — unlike
    // WithCover, which is the user-initiated "pick a new cover" action and resets crop to
    // whatever the picker submitted. Used by PhotoDuplicateMergeService: when the duplicate
    // being merged away is the current cover, the survivor's own (bit-identical) blob takes over
    // the same framing rather than resetting it to center.
    public Chapter WithCoverPhotoId(PhotoId coverPhotoId, DateTime updatedAt) =>
        Mutate(() => { CoverPhotoId = coverPhotoId; UpdatedAt = updatedAt; });

    public Chapter WithName(string name, DateTime updatedAt) =>
        Mutate(() => { Name = name; UpdatedAt = updatedAt; });

    public Chapter WithCover(Photo photo, ImageCrop crop, DateTime updatedAt) =>
        Mutate(() => { CoverPhotoId = photo.Id; CoverCrop = crop; UpdatedAt = updatedAt; });

    private Chapter Mutate(Action action) { action(); return this; }
}
