using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Core.Bauls.OutputPorts;
public sealed class Baul : Entity<BaulId>
{
    public string Name { get; private set; }
    public string? Description { get; private set; }
    public UserId CustodioId { get; private set; }
    public int ChapterCount { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public ImageCrop CoverCrop { get; private set; }
    public PhotoId? CoverPhotoId { get; private set; }

    public Baul(
    BaulId Id,
    string Name,
    string? Description,
    UserId CustodioId,
    int ChapterCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    ImageCrop CoverCrop,
    PhotoId? CoverPhotoId = null) : base(Id)
    {
        this.Name = Name;
        this.Description = Description;
        this.CustodioId = CustodioId;
        this.ChapterCount = ChapterCount;
        this.CreatedAt = CreatedAt;
        this.UpdatedAt = UpdatedAt;
        this.CoverCrop = CoverCrop;
        this.CoverPhotoId = CoverPhotoId;
    }

    public Baul(
        BaulId Id, string Name, string? Description, UserId CustodioId, int ChapterCount,
        DateTime CreatedAt, DateTime UpdatedAt)
        : this(Id, Name, Description, CustodioId, ChapterCount, CreatedAt, UpdatedAt, ImageCrop.DefaultCoverCrop)
    {
    }

    // The single interpretation of "is this user the baúl's custodio" — a legal-custody
    // relationship, singular and non-transferable except via an explicit ownership change, not a
    // permission level. Callers should ask this instead of re-deriving it from CustodioId
    // equality by hand; see BaulRole.cs for why Custodio isn't a role.
    public bool IsCustodio(UserId userId) => CustodioId == userId;

    public Baul WithChapterAdded(DateTime updatedAt) =>
        Mutate(() => { ChapterCount++; UpdatedAt = updatedAt; });

    public Baul WithChapterRemoved(DateTime updatedAt) =>
        Mutate(() => { ChapterCount--; UpdatedAt = updatedAt; });

    public Baul WithDetails(string name, string? description, DateTime updatedAt) =>
        Mutate(() => { Name = name; Description = description; UpdatedAt = updatedAt; });

    // Same cover-photo rule as Chapter (see Chapter.WithPhotoAdded/WithPhotoRemoved/WithCover):
    // first photo in becomes the cover, only the current cover is ever cleared.
    public Baul WithPhotoAdded(PhotoRef photo, DateTime updatedAt) =>
        Mutate(() => { CoverPhotoId ??= photo.Id; UpdatedAt = updatedAt; });

    public Baul WithPhotoRemoved(PhotoRef photo, DateTime updatedAt) =>
        Mutate(() => { if (CoverPhotoId == photo.Id) CoverPhotoId = null; UpdatedAt = updatedAt; });

    // See Chapter.WithCoverPhotoId for why this is a separate, crop-preserving method from
    // WithCover.
    public Baul WithCoverPhotoId(PhotoId coverPhotoId, DateTime updatedAt) =>
        Mutate(() => { CoverPhotoId = coverPhotoId; UpdatedAt = updatedAt; });

    public Baul WithCover(Photo photo, ImageCrop crop, DateTime updatedAt) =>
        Mutate(() => { CoverPhotoId = photo.Id; CoverCrop = crop; UpdatedAt = updatedAt; });

    private Baul Mutate(Action action) { action(); return this; }
}
