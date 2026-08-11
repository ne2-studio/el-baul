using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using ElBaul.Domain;
namespace ElBaul.OutputPorts.Bauls;
public record Baul
(
    BaulId Id,
    string Name,
    string? Description,
    UserId CustodioId,
    int ChapterCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? CoverPhotoKey = null
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

    // Same cover-photo rule as Chapter (see Chapter.WithPhotoAdded/WithPhotoRemoved/WithCover):
    // first photo in becomes the cover, only the current cover is ever cleared.
    public Baul WithPhotoAdded(Photo photo, DateTime updatedAt) =>
        this with
        {
            CoverPhotoKey = string.IsNullOrEmpty(CoverPhotoKey) ? photo.StorageKey : CoverPhotoKey,
            UpdatedAt = updatedAt
        };

    public Baul WithPhotoRemoved(Photo photo, DateTime updatedAt) =>
        this with
        {
            CoverPhotoKey = CoverPhotoKey == photo.StorageKey ? null : CoverPhotoKey,
            UpdatedAt = updatedAt
        };

    public Baul WithCover(Photo photo, DateTime updatedAt) =>
        this with { CoverPhotoKey = photo.StorageKey, UpdatedAt = updatedAt };
}
