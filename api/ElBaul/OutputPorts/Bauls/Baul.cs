using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
namespace ElBaul.OutputPorts.Bauls;
public record Baul
(
    BaulId Id,
    string Name,
    string? Description,
    string CustodioId,
    int ChapterCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? CoverPhotoKey = null
)
{
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
