namespace ElBaul.Ports.Input;

public record PhotoDto
(
    string Id,
    string? AlbumId,
    string BaulId,
    string ThumbnailUrl,
    string FullUrl,
    string? Caption,
    int? DateYear,
    int? DateMonth,
    int? DateDay,
    string UploadedBy,
    DateTime CreatedAt,
    int RecuerdoCount
);

public record PhotoDownloadResult(Stream Content, string ContentType, string FileName);
