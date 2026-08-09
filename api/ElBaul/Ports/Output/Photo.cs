namespace ElBaul.Ports.Output;

public record Photo
(
    PhotoId Id,
    ChapterId? ChapterId,
    BaulId BaulId,
    string StorageKey,
    int? DateYear,
    int? DateMonth,
    int? DateDay,
    string UploadedBy,
    DateTime CreatedAt,
    Guid? ClientUploadId = null,
    PhotoStatus Status = PhotoStatus.Active,
    DateTime? DeletedAt = null,
    string? DeletionReason = null,
    long SizeBytes = 0,
    // Shared by every photo uploaded together in one client action — unlike ClientUploadId
    // (a unique per-photo idempotency key), several photos legitimately share this value.
    // Powers the baúl feed's "upload batch" cards (see IPhotoUploadBatchReadModel). Null for
    // photos uploaded before this field existed or with no batch context.
    Guid? UploadBatchId = null,
    // A family member explicitly confirmed nobody is in this photo, so it should stop being
    // proposed by the "help us tag this photo" contribution suggestion even though it has no
    // PhotoPersonaTag either — without this, a landscape/document photo would be sorted as a
    // candidate forever. Reset back to false as a side effect of the photo actually receiving a
    // tag (SetTaggedPersonasAsync/AddTaggedPersonasBatchAsync), so a later manual tagging always
    // wins over a stale confirmation.
    bool ConfirmedNoPersonas = false
)
{
    // DateYear/Month/Day stay the raw persisted columns — EF Core can't map an optional
    // (nullable) complex/owned type (see https://github.com/dotnet/efcore/issues/31376, hit
    // when this was tried), so PhotoDate lives only on the domain side: a single validated
    // read of the three columns, and the sanctioned way to change them (WithDate/Create)
    // instead of touching DateYear/Month/Day directly.
    public PhotoDate? Date =>
        DateYear is { } year && PhotoDate.TryCreate(year, DateMonth, DateDay, out var date, out _) ? date : null;

    public static Photo Create(
        PhotoId id, ChapterId? chapterId, BaulId baulId, string storageKey, PhotoDate? date,
        string uploadedBy, DateTime createdAt, Guid? clientUploadId = null, long sizeBytes = 0,
        Guid? uploadBatchId = null) =>
        new(id, chapterId, baulId, storageKey, date?.Year, date?.Month, date?.Day, uploadedBy, createdAt, clientUploadId,
            SizeBytes: sizeBytes, UploadBatchId: uploadBatchId);

    public Photo WithDate(PhotoDate? date) =>
        this with { DateYear = date?.Year, DateMonth = date?.Month, DateDay = date?.Day };

    public Photo WithConfirmedNoPersonas(bool confirmedNoPersonas) =>
        this with { ConfirmedNoPersonas = confirmedNoPersonas };
}
