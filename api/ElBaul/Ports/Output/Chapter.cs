namespace ElBaul.Ports.Output;

public record Chapter
(
    Guid Id,
    Guid BaulId,
    string Name,
    int PhotoCount,
    string? CoverPhotoKey,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
