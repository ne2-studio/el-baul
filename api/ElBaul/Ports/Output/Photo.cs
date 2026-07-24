namespace ElBaul.Ports.Output;

public record Photo
(
    Guid Id,
    Guid? ChapterId,
    Guid BaulId,
    string StorageKey,
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
