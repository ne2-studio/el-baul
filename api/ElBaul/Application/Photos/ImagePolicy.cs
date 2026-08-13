namespace ElBaul.Application.Photos;

/// <summary>
/// Single source of truth for the resolution/size limits every uploaded photo must satisfy —
/// both the upload pipeline (PhotoFileService) and the normalization backfill
/// (BackfillNormalizePhotosCommand) decide against this exact type, never against a
/// locally-hardcoded number, so the two paths can't quietly drift apart. Values are
/// configuration-bound (see ElBaul.Infra's ServiceRegistration, "ImagePolicy" section) but
/// default to the numbers below if unconfigured.
///
/// MaxStoredLongEdge exists so every stored photo stays within imgproxy's default source
/// resolution limits — imgproxy is a last line of defense, not where normalization happens.
/// </summary>
public sealed record ImagePolicy(
    int MaxStoredLongEdge = ImagePolicy.DefaultMaxStoredLongEdge,
    long MaxUploadBytes = ImagePolicy.DefaultMaxUploadBytes,
    long MaxUploadMegapixels = ImagePolicy.DefaultMaxUploadMegapixels)
{
    public const int DefaultMaxStoredLongEdge = 4096;

    // Kept as a round decimal number, not MiB (25 * 1024 * 1024), because
    // PhotosController's [RequestSizeLimit] attribute needs a compile-time constant and can't
    // reference this type (controllers may only depend on Ports/Input — see
    // docs/architecture/backend.md) — the two are kept in sync manually, and a round decimal
    // number is easiest to keep matched by eye.
    public const long DefaultMaxUploadBytes = 25_000_000;

    public const long DefaultMaxUploadMegapixels = 120;

    public bool ExceedsUploadBytes(long sizeBytes) => sizeBytes > MaxUploadBytes;

    public bool ExceedsUploadMegapixels(int width, int height) =>
        (long)width * height > MaxUploadMegapixels * 1_000_000;

    public bool NeedsNormalization(int width, int height) =>
        width > MaxStoredLongEdge || height > MaxStoredLongEdge;

    /// <summary>The long-edge-limited, aspect-ratio-preserved size NormalizeAsync should
    /// produce — exposed so callers that only need the target size (dry-run reporting) don't
    /// have to actually process the image to know it.</summary>
    public (int Width, int Height) ComputeNormalizedSize(int width, int height)
    {
        if (!NeedsNormalization(width, height)) return (width, height);

        var scale = (double)MaxStoredLongEdge / Math.Max(width, height);
        return (Math.Max(1, (int)Math.Round(width * scale)), Math.Max(1, (int)Math.Round(height * scale)));
    }
}
