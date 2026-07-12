namespace ElBaul.Ports.Input;

public record AlbumDto
(
    string Id,
    string BaulId,
    string Name,
    string? Description,
    int PhotoCount,
    string? CoverPhotoUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
