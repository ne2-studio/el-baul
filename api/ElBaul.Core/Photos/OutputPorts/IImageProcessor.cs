namespace ElBaul.OutputPorts.Photos;

/// <summary>Raw pixel dimensions of an image, read off its header/metadata — never the
/// display orientation. Null from IdentifyAsync means the content couldn't be identified as a
/// valid image at all.</summary>
public record ImageMetadata(int Width, int Height);

public record NormalizedImage(Stream Content, string ContentType, int Width, int Height, long SizeBytes);

/// <summary>
/// The one place in the codebase that knows how to inspect/resize image pixels — everything
/// else (upload, both photo backfill commands) goes through this instead of talking to an
/// image library directly, so ImagePolicy's resolution rules only ever get interpreted once.
/// Implementations must avoid loading a full decoded bitmap just to answer IdentifyAsync (read
/// header/metadata only), and NormalizeAsync should shrink during decode rather than decode
/// full size then downscale, to keep memory use proportional to the output, not the source.
/// </summary>
public interface IImageProcessor
{
    Task<ImageMetadata?> IdentifyAsync(Stream content);

    /// <summary>Produces a version of <paramref name="content"/> with its long edge capped at
    /// <paramref name="maxLongEdge"/>px, aspect ratio preserved, EXIF orientation baked into the
    /// pixels, and non-essential metadata (including GPS) stripped. Never upscales — a caller
    /// should only call this once ImagePolicy.NeedsNormalization is true.</summary>
    Task<NormalizedImage> NormalizeAsync(Stream content, int maxLongEdge);
}
