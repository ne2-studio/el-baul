namespace ElBaul.Ports.Output;

public record Album
(
    Guid Id,
    Guid BaulId,
    string Name,
    int PhotoCount,
    string? CoverPhotoKey,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
