using ElBaul.Domain;
namespace ElBaul.Core.Photos.Domain;

// The stored image/file behind one or more Photo rows — everything intrinsic to the bytes
// actually sitting in object storage, as opposed to their meaning inside a vault (that's
// Photo's job: VaultId/BaulId, date, description, tags, chapter, ...). See docs/.backlog for the
// multi-vault groundwork this is Slice 1 of.
//
// Deliberately never the "photograph" concept itself — Photo remains the aggregate root every
// application service and DTO works with. Nothing outside the Photos module should reference
// PhotoAsset directly; Photo exposes the asset's fields it needs (StorageKey, Dimensions, ...)
// as its own read-only properties instead of leaking this type into callers.
//
// Strictly 1:1 with its owning Photo for now — every Photo.Create call builds its own PhotoAsset
// alongside it (see Photo.cs) — but nothing here prevents a later Photo from pointing at an
// already-existing PhotoAsset (no uniqueness constraint ties PhotoAssetId back to a single
// Photo); that's the shape a later slice needs to let two Photos in different baúles share one
// underlying image.
public sealed class PhotoAsset : Entity<PhotoAssetId>
{
    private PhotoAsset() : base(default) { }

    public string StorageKey { get; private set; }
    public long SizeBytes { get; private set; }
    public ImageDimensions Dimensions { get; private set; } = new(1, 1);
    public DateTime CreatedAt { get; private set; }

    // Who originally contributed this asset — set once, here, at creation time, and never
    // touched again. Deliberately distinct from Photo.UploadedBy: once Photo.CreateFromExistingAsset
    // (docs/.backlog issue #62, Slice 2) lets an existing asset back a brand-new Photo in another
    // baúl, that Photo gets its own fresh UploadedBy for "who added it to *this* baúl" — this
    // field is the only reliable answer to "who uploaded the underlying photo in the first
    // place", which the user-scoped "Mis fotos" cross-baúl view is keyed on.
    public UserId UploadedBy { get; private set; }

    // Dimensions/size of the asset as it actually sits in storage today. Never the *display*
    // orientation — raw pixel dimensions of the stored bytes. Set only when the stored asset is
    // a normalized (downscaled) version of what the user uploaded — the pre-normalization
    // dimensions/size, for measuring normalization's storage impact later (see docs/.backlog
    // ticket 010). Null means the stored bytes are exactly what was uploaded, byte for byte.
    public ImageDimensions? OriginalDimensions { get; private set; }
    public long? OriginalSizeBytes { get; private set; }

    // SHA-256 (lowercase hex) of the bytes the server actually received for this upload,
    // computed before any server-side image processing — see PhotoFileService. Null for every
    // asset created before this field existed. This is the canonical value; Photo also carries
    // its own denormalized copy (see Photo.OriginalContentHash) purely to keep the existing
    // per-baúl exact-duplicate database constraint working, since that constraint is scoped by
    // BaulId — a Photo-context concept this asset deliberately knows nothing about.
    public string? OriginalContentHash { get; private set; }

    public PhotoAsset(
        PhotoAssetId Id, string StorageKey, ImageDimensions Dimensions, DateTime CreatedAt, UserId UploadedBy,
        long SizeBytes = 0, ImageDimensions? OriginalDimensions = null, long? OriginalSizeBytes = null,
        string? OriginalContentHash = null) : base(Id)
    {
        if (Dimensions.Width <= 0 || Dimensions.Height <= 0)
            throw new ArgumentOutOfRangeException(nameof(Dimensions), "Photo asset dimensions must be positive.");

        this.StorageKey = StorageKey; this.Dimensions = Dimensions; this.CreatedAt = CreatedAt;
        this.UploadedBy = UploadedBy;
        this.SizeBytes = SizeBytes; this.OriginalDimensions = OriginalDimensions;
        this.OriginalSizeBytes = OriginalSizeBytes; this.OriginalContentHash = OriginalContentHash;
    }

    public static PhotoAsset Create(
        PhotoAssetId id, string storageKey, ImageDimensions dimensions, DateTime createdAt, UserId uploadedBy,
        long sizeBytes = 0, ImageDimensions? originalDimensions = null, long? originalSizeBytes = null,
        string? originalContentHash = null) =>
        new(id, storageKey, dimensions, createdAt, uploadedBy, sizeBytes, originalDimensions, originalSizeBytes, originalContentHash);
}
