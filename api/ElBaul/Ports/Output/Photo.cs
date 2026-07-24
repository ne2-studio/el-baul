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
    string? DeletionReason = null
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
        string uploadedBy, DateTime createdAt, Guid? clientUploadId = null) =>
        new(id, chapterId, baulId, storageKey, date?.Year, date?.Month, date?.Day, uploadedBy, createdAt, clientUploadId);

    public Photo WithDate(PhotoDate? date) =>
        this with { DateYear = date?.Year, DateMonth = date?.Month, DateDay = date?.Day };
}
