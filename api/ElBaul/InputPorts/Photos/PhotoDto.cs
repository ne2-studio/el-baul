namespace ElBaul.InputPorts.Photos;
public record PhotoDto
(
    string Id,
    string? ChapterId,
    string BaulId,
    string ThumbnailUrl,
    string FullUrl,
    int? DateYear,
    int? DateMonth,
    int? DateDay,
    string UploadedBy,
    DateTime CreatedAt,
    int RecuerdoCount
);

public record PhotoDownloadResult(Stream Content, string ContentType, string FileName);

public record PhotoPageDto(IReadOnlyList<PhotoDto> Items, bool HasMore);
