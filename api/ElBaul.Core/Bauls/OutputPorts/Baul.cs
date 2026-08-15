using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Core.Bauls.OutputPorts;
public record Baul
(
    BaulId Id,
    string Name,
    string? Description,
    UserId CustodioId,
    int ChapterCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? CoverPhotoKey = null,
    decimal CoverCropX = 0.5m,
    decimal CoverCropY = 0.5m,
    decimal CoverCropScale = 1m
)
{
    // The single interpretation of "is this user the baúl's custodio" — a legal-custody
    // relationship, singular and non-transferable except via an explicit ownership change, not a
    // permission level. Callers should ask this instead of re-deriving it from CustodioId
    // equality by hand; see BaulRole.cs for why Custodio isn't a role.
    public bool IsCustodio(UserId userId) => CustodioId == userId;

    public Baul WithChapterAdded(DateTime updatedAt) =>
        this with { ChapterCount = ChapterCount + 1, UpdatedAt = updatedAt };

    public Baul WithChapterRemoved(DateTime updatedAt) =>
        this with { ChapterCount = ChapterCount - 1, UpdatedAt = updatedAt };

    public Baul WithDetails(string name, string? description, DateTime updatedAt) =>
        this with { Name = name, Description = description, UpdatedAt = updatedAt };

    // Same cover-photo rule as Chapter (see Chapter.WithPhotoAdded/WithPhotoRemoved/WithCover):
    // first photo in becomes the cover, only the current cover is ever cleared.
    public Baul WithPhotoAdded(PhotoRef photo, DateTime updatedAt) =>
        this with
        {
            CoverPhotoKey = string.IsNullOrEmpty(CoverPhotoKey) ? photo.StorageKey : CoverPhotoKey,
            UpdatedAt = updatedAt
        };

    public Baul WithPhotoRemoved(PhotoRef photo, DateTime updatedAt) =>
        this with
        {
            CoverPhotoKey = CoverPhotoKey == photo.StorageKey ? null : CoverPhotoKey,
            UpdatedAt = updatedAt
        };

    // See Chapter.WithCoverPhotoKey for why this is a separate, crop-preserving method from
    // WithCover.
    public Baul WithCoverPhotoKey(string coverPhotoKey, DateTime updatedAt) =>
        this with { CoverPhotoKey = coverPhotoKey, UpdatedAt = updatedAt };

    public Baul WithCover(Photo photo, decimal cropX, decimal cropY, decimal cropScale, DateTime updatedAt) =>
        this with
        {
            CoverPhotoKey = photo.StorageKey,
            CoverCropX = cropX,
            CoverCropY = cropY,
            CoverCropScale = cropScale,
            UpdatedAt = updatedAt
        };
}
