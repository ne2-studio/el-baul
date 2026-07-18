namespace ElBaul.Ports.Output;

public record Photo
(
    Guid Id,
    Guid? AlbumId,
    Guid BaulId,
    string StorageKey,
    string? Caption,
    DateTime Date,
    string UploadedBy,
    DateTime CreatedAt,
    Guid? ClientUploadId = null
);
