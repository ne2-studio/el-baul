namespace ElBaul.Ports.Output;

public record Album
(
    Guid Id,
    Guid BaulId,
    string Name,
    string? Description,
    int PhotoCount,
    string? CoverPhotoKey,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
