using ElBaul.Domain;
namespace ElBaul.Core.Photos.Domain;
public sealed class Photo : Entity<PhotoId>
{
    private Photo() : base(default) { }

    public ChapterId? ChapterId { get; private set; }
    public BaulId BaulId { get; private set; }
    public string StorageKey { get; private set; }
    public PhotoDate? TakenAt { get; private set; }
    public UserId UploadedBy { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public Guid? ClientUploadId { get; private set; }
    public PhotoStatus Status { get; private set; }
    public DateTime? DeletedAt { get; private set; }
    public string? DeletionReason { get; private set; }
    public long SizeBytes { get; private set; }
    public Guid? UploadBatchId { get; private set; }
    public bool ConfirmedNoPersonas { get; private set; }
    public ImageDimensions Dimensions { get; private set; } = new(0, 0);
    public ImageDimensions? OriginalDimensions { get; private set; }
    public long? OriginalSizeBytes { get; private set; }
    public string? OriginalContentHash { get; private set; }

    public Photo(
    PhotoId Id,
    ChapterId? ChapterId,
    BaulId BaulId,
    string StorageKey,
    PhotoDate? TakenAt,
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
    ImageDimensions? Dimensions = null,
    // Set only when the stored asset is a normalized (downscaled) version of what the user
    // uploaded — the pre-normalization dimensions/size, for measuring normalization's storage
    // impact later (see docs/.backlog ticket 010). Null means the stored bytes are exactly what
    // was uploaded, byte for byte.
    ImageDimensions? OriginalDimensions = null,
    long? OriginalSizeBytes = null,
    // SHA-256 (lowercase hex) of the bytes the server actually received for this upload,
    // computed before any server-side image processing — see PhotoFileService. Null for every
    // photo uploaded before this field existed. Duplicate identity (see
    // PhotoDuplicateMergeService) is strictly (BaulId, OriginalContentHash) among Active
    // photos; never used across baúles.
    string? OriginalContentHash = null) : base(Id)
    {
        this.ChapterId = ChapterId; this.BaulId = BaulId; this.StorageKey = StorageKey;
        this.TakenAt = TakenAt;
        this.UploadedBy = UploadedBy; this.CreatedAt = CreatedAt; this.ClientUploadId = ClientUploadId;
        this.Status = Status; this.DeletedAt = DeletedAt; this.DeletionReason = DeletionReason;
        this.SizeBytes = SizeBytes; this.UploadBatchId = UploadBatchId;
        this.ConfirmedNoPersonas = ConfirmedNoPersonas; this.Dimensions = Dimensions ?? new(0, 0);
        this.OriginalDimensions = OriginalDimensions;
        this.OriginalSizeBytes = OriginalSizeBytes; this.OriginalContentHash = OriginalContentHash;
    }

    public bool WasResized => OriginalDimensions is not null;

    public static Photo Create(
        PhotoId id, ChapterId? chapterId, BaulId baulId, string storageKey, PhotoDate? date,
        UserId uploadedBy, DateTime createdAt, Guid? clientUploadId = null, long sizeBytes = 0,
        Guid? uploadBatchId = null, ImageDimensions? dimensions = null,
        ImageDimensions? originalDimensions = null, long? originalSizeBytes = null,
        string? originalContentHash = null) =>
        new(id, chapterId, baulId, storageKey, date, uploadedBy, createdAt, clientUploadId,
            SizeBytes: sizeBytes, UploadBatchId: uploadBatchId, Dimensions: dimensions,
            OriginalDimensions: originalDimensions, OriginalSizeBytes: originalSizeBytes,
            OriginalContentHash: originalContentHash);

    public Photo WithDate(PhotoDate? date) =>
        Mutate(() => TakenAt = date);

    public Photo WithOriginalContentHash(string? hash) =>
        Mutate(() => OriginalContentHash = hash);

    public Photo WithConfirmedNoPersonas(bool confirmedNoPersonas) =>
        Mutate(() => ConfirmedNoPersonas = confirmedNoPersonas);

    public Photo InChapter(ChapterId chapterId) =>
        Mutate(() => ChapterId = chapterId);

    public Photo WithoutChapter() =>
        Mutate(() => ChapterId = null);

    public Photo MarkDeleted(string? reason, DateTime deletedAt) =>
        Mutate(() => { Status = PhotoStatus.Deleted; DeletedAt = deletedAt; DeletionReason = reason; });

    private Photo Mutate(Action action) { action(); return this; }
}
