namespace ElBaul.Ports.Input;

public record PhotoDto
(
    string Id,
    string? AlbumId,
    string BaulId,
    string ThumbnailUrl,
    string FullUrl,
    string? Caption,
    DateTime Date,
    string UploadedBy,
    DateTime CreatedAt,
    int RecuerdoCount
);
