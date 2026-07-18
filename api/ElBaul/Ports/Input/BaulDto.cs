namespace ElBaul.Ports.Input;

public record BaulDto
(
    string Id,
    string Name,
    string? Description,
    int AlbumCount,
    string? CoverPhotoUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    bool IsCustodio,
    string Role,
    int MemberCount
);
