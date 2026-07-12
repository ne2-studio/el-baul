namespace ElBaul.Ports.Input;

public record PhotoDto
(
    string Id,
    string AlbumId,
    string BaulId,
    string Url,
    string? Caption,
    DateTime Date,
    string UploadedBy,
    DateTime CreatedAt
);
