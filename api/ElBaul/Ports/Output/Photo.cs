namespace ElBaul.Ports.Output;

public record Photo
(
    Guid Id,
    Guid? AlbumId,
    Guid BaulId,
    string StorageKey,
    string? Caption,
    int? DateYear,
    int? DateMonth,
    int? DateDay,
    string UploadedBy,
    DateTime CreatedAt,
    Guid? ClientUploadId = null,
    PhotoStatus Status = PhotoStatus.Active,
    DateTime? DeletedAt = null,
    string? DeletionReason = null
);
