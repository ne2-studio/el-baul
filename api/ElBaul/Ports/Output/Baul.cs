namespace ElBaul.Ports.Output;

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
);
