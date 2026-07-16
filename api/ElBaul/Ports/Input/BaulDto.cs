namespace ElBaul.Ports.Input;

public record BaulDto
(
    string Id,
    string Name,
    string? Description,
    int AlbumCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    bool IsCustodio,
    string Role,
    int SharedCount
);
