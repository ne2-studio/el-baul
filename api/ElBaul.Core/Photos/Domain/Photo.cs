using ElBaul.Domain;
namespace ElBaul.Core.Photos.Domain;
public sealed class Photo : Entity<PhotoId>
{
    private Photo() : base(default) { }

    public ChapterId? ChapterId { get; private set; }
    public BaulId BaulId { get; private set; }
    public PhotoAssetId PhotoAssetId { get; private set; }

    // Populated whenever this Photo was loaded through a query that included it (every
    // IPhotoRepository/IPhotoListReadModel read path does) — null only for a Photo built by hand
    // without going through Create/the persistence layer. Not exposed outside the Photos module;
    // callers keep reading StorageKey/Dimensions/... below instead of reaching into this.
    public PhotoAsset PhotoAsset { get; private set; }

    public PhotoDate? TakenAt { get; private set; }
    public UserId UploadedBy { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public Guid? ClientUploadId { get; private set; }
    public PhotoStatus Status { get; private set; }
    public DateTime? DeletedAt { get; private set; }
    public string? DeletionReason { get; private set; }
    public Guid? UploadBatchId { get; private set; }
    public bool ConfirmedNoPersonas { get; private set; }

    // Denormalized copy of PhotoAsset.OriginalContentHash — see that property's doc comment for
    // why this exists on Photo at all despite being intrinsic to the asset, not the vault
    // context: it's what IX_Photos_BaulId_OriginalContentHash_Active is built on, and that
    // per-baúl exact-duplicate constraint (PhotoDuplicateMergeService) is Photo-context-scoped
    // by BaulId, which PhotoAsset deliberately doesn't know about. Kept in lockstep with the
    // asset's own value at creation time; PhotoDuplicateMergeService.MergeGroupAsync is the one
    // place that later lets a survivor's copy diverge from its own asset (see WithOriginalContentHash).
    public string? OriginalContentHash { get; private set; }

    // Passthrough read accessors for the asset-intrinsic fields every existing photo-read call
    // site (URL generation, download, storage cleanup, ...) already used before this type
    // existed — see docs/.backlog issue #62 (multi-vault groundwork, Slice 1). Keeping these
    // here means those call sites don't need to know PhotoAsset exists at all.
    public string StorageKey => PhotoAsset.StorageKey;
    public long SizeBytes => PhotoAsset.SizeBytes;
    public ImageDimensions Dimensions => PhotoAsset.Dimensions;
    public ImageDimensions? OriginalDimensions => PhotoAsset.OriginalDimensions;
    public long? OriginalSizeBytes => PhotoAsset.OriginalSizeBytes;

    public Photo(
    PhotoId Id,
    ChapterId? ChapterId,
    BaulId BaulId,
    PhotoAsset PhotoAsset,
    PhotoDate? TakenAt,
    UserId UploadedBy,
    DateTime CreatedAt,
    Guid? ClientUploadId = null,
    PhotoStatus Status = PhotoStatus.Active,
    DateTime? DeletedAt = null,
    string? DeletionReason = null,
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
    bool ConfirmedNoPersonas = false) : base(Id)
    {
        this.ChapterId = ChapterId; this.BaulId = BaulId;
        this.PhotoAsset = PhotoAsset; this.PhotoAssetId = PhotoAsset.Id;
        this.TakenAt = TakenAt;
        this.UploadedBy = UploadedBy; this.CreatedAt = CreatedAt; this.ClientUploadId = ClientUploadId;
        this.Status = Status; this.DeletedAt = DeletedAt; this.DeletionReason = DeletionReason;
        this.UploadBatchId = UploadBatchId;
        this.ConfirmedNoPersonas = ConfirmedNoPersonas; this.OriginalContentHash = PhotoAsset.OriginalContentHash;
    }

    public bool WasResized => OriginalDimensions is not null;

    // Builds a brand-new Photo together with its own brand-new PhotoAsset — the only construction
    // path in this slice, since every Photo still owns exactly one PhotoAsset nobody else
    // references yet. The asset's id deliberately reuses this Photo's own Guid: simple, avoids
    // threading a second id-generator call through every caller (PhotoMother, PhotoUploadWorkflow,
    // persistence tests, ...), and carries no semantic meaning — a future Photo sharing an
    // *existing* PhotoAsset would go through a different constructor path that takes the asset
    // (or its id) directly instead of calling this factory.
    public static Photo Create(
        PhotoId id, ChapterId? chapterId, BaulId baulId, string storageKey, PhotoDate? date,
        UserId uploadedBy, DateTime createdAt, ImageDimensions dimensions,
        Guid? clientUploadId = null, long sizeBytes = 0,
        Guid? uploadBatchId = null,
        ImageDimensions? originalDimensions = null, long? originalSizeBytes = null,
        string? originalContentHash = null)
    {
        var photoAsset = PhotoAsset.Create(
            new PhotoAssetId(id.Value), storageKey, dimensions, createdAt,
            sizeBytes, originalDimensions, originalSizeBytes, originalContentHash);

        return new(id, chapterId, baulId, photoAsset, date, uploadedBy, createdAt, clientUploadId,
            UploadBatchId: uploadBatchId);
    }

    // Builds a Photo that reuses an existing PhotoAsset instead of creating a new one — the
    // "Add to another baúl" operation (docs/.backlog issue #62, Slice 2). Deliberately bypasses
    // Create: no new PhotoAsset, no storage write, so the physical file is genuinely shared
    // between the source Photo and this new one. Only the metadata that makes sense as an
    // initial value for the same photograph in a new context is carried over — never the source
    // Photo's chapter, tags, memories, upload-batch or client-upload identity, all of which are
    // specific to the baúl it's coming from. See PhotoManager.AddToBaulAsync for the full rule.
    public static Photo CreateFromExistingAsset(
        PhotoId id, BaulId baulId, PhotoAsset asset, PhotoDate? takenAt, UserId uploadedBy, DateTime createdAt) =>
        new(id, ChapterId: null, baulId, asset, takenAt, uploadedBy, createdAt);

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
