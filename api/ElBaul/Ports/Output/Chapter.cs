namespace ElBaul.Ports.Output;

public record Chapter
(
    ChapterId Id,
    BaulId BaulId,
    string Name,
    int PhotoCount,
    string? CoverPhotoKey,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
