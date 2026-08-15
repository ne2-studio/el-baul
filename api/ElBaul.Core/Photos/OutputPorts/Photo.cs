using ElBaul.Domain;
namespace ElBaul.Core.Photos.OutputPorts;
public record Photo
(
    PhotoId Id,
    ChapterId? ChapterId,
    BaulId BaulId,
    string StorageKey,
    int? DateYear,
    int? DateMonth,
    int? DateDay,
    UserId UploadedBy,
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
    bool ConfirmedNoPersonas = false,
    // Dimensions/size of the asset as it actually sits in storage today — for a photo uploaded
    // before this field existed, 0 until it's set (see ImagePolicy). Never the *display*
    // orientation — raw pixel dimensions of the stored bytes.
    int Width = 0,
    int Height = 0,
    // Set only when the stored asset is a normalized (downscaled) version of what the user
    // uploaded — the pre-normalization dimensions/size, for measuring normalization's storage
    // impact later (see docs/.backlog ticket 010). Null means the stored bytes are exactly what
    // was uploaded, byte for byte.
    int? OriginalWidth = null,
    int? OriginalHeight = null,
    long? OriginalSizeBytes = null,
    // SHA-256 (lowercase hex) of the bytes the server actually received for this upload,
    // computed before any server-side image processing — see PhotoFileService. Null for every
    // photo uploaded before this field existed. Duplicate identity (see
    // PhotoDuplicateMergeService) is strictly (BaulId, OriginalContentHash) among Active
    // photos; never used across baúles.
    string? OriginalContentHash = null
)
{
    public bool WasResized => OriginalWidth is not null;


    // DateYear/Month/Day stay the raw persisted columns — EF Core can't map an optional
    // (nullable) complex/owned type (see https://github.com/dotnet/efcore/issues/31376, hit
    // when this was tried), so PhotoDate lives only on the domain side: a single validated
    // read of the three columns, and the sanctioned way to change them (WithDate/Create)
    // instead of touching DateYear/Month/Day directly.
    public PhotoDate? Date =>
        DateYear is { } year && PhotoDate.Parse(year, DateMonth, DateDay) is { IsSuccess: true, Value: var date } ? date : null;

    public static Photo Create(
        PhotoId id, ChapterId? chapterId, BaulId baulId, string storageKey, PhotoDate? date,
        UserId uploadedBy, DateTime createdAt, Guid? clientUploadId = null, long sizeBytes = 0,
        Guid? uploadBatchId = null, int width = 0, int height = 0,
        int? originalWidth = null, int? originalHeight = null, long? originalSizeBytes = null,
        string? originalContentHash = null) =>
        new(id, chapterId, baulId, storageKey, date?.Year, date?.Month, date?.Day, uploadedBy, createdAt, clientUploadId,
            SizeBytes: sizeBytes, UploadBatchId: uploadBatchId, Width: width, Height: height,
            OriginalWidth: originalWidth, OriginalHeight: originalHeight, OriginalSizeBytes: originalSizeBytes,
            OriginalContentHash: originalContentHash);

    public Photo WithDate(PhotoDate? date) =>
        this with { DateYear = date?.Year, DateMonth = date?.Month, DateDay = date?.Day };

    public Photo WithOriginalContentHash(string? hash) =>
        this with { OriginalContentHash = hash };

    public Photo WithConfirmedNoPersonas(bool confirmedNoPersonas) =>
        this with { ConfirmedNoPersonas = confirmedNoPersonas };

    public Photo InChapter(ChapterId chapterId) =>
        this with { ChapterId = chapterId };

    public Photo WithoutChapter() =>
        this with { ChapterId = null };

    public Photo MarkDeleted(string? reason, DateTime deletedAt) =>
        this with
        {
            Status = PhotoStatus.Deleted,
            DeletedAt = deletedAt,
            DeletionReason = reason
        };
}
