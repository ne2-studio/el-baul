namespace ElBaul.Ports.Output;

public record Baul
(
    Guid Id,
    string Name,
    string? Description,
    string CustodioId,
    int AlbumCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
