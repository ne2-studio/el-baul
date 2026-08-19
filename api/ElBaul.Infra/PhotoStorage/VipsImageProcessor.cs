using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Domain;
using Microsoft.Extensions.Logging;
using NetVips;

namespace ElBaul.Infra.PhotoStorage;

/// <summary>
/// Applies ImagePolicy's resolution rules using libvips via NetVips. IdentifyAsync loads a
/// lazy libvips pipeline (Image.NewFromBuffer) — libvips parses only the header at that point,
/// it never decodes pixel data unless something downstream forces it to, so this stays cheap
/// even for a huge source image. NormalizeAsync uses ThumbnailBuffer, libvips' shrink-on-load
/// path, so memory use tracks the *output* size rather than the source's — deliberately not
/// "decode full bitmap, then resize" (see docs/ARCHITECTURE.md / ticket 010).
///
/// Registered as a singleton (see ServiceRegistration) purely so NormalizationThrottle is
/// shared process-wide rather than duplicated per scope — the class itself holds no per-request
/// state. Alpine's `vips` package (see api/Dockerfile) provides the native libvips this process
/// links against; NetVips itself is the managed binding only, no bundled native binary.
/// </summary>
public class VipsImageProcessor(ILogger<VipsImageProcessor> logger) : IImageProcessor
{
    // libvips' own loader name for each buffer-decoded format ("<format>load_buffer") mapped to
    // the MIME type the rest of the pipeline stores/serves — this is what makes IdentifyAsync's
    // ContentType trustworthy: it comes from the loader libvips actually picked to decode the
    // bytes, never from a client-declared content-type or filename extension.
    private static readonly Dictionary<string, string> ContentTypesByLoader = new(StringComparer.Ordinal)
    {
        ["jpegload_buffer"] = "image/jpeg",
        ["pngload_buffer"] = "image/png",
        ["gifload_buffer"] = "image/gif",
        ["webpload_buffer"] = "image/webp",
    };

    // A memory-safety valve for the container this process runs in, not a tunable performance
    // knob — deliberately small and fixed rather than configurable (see ticket 010). Only
    // NormalizeAsync (the heavy path) is gated; IdentifyAsync stays header-only and cheap.
    private readonly SemaphoreSlim _normalizationThrottle = new(2, 2);

    public Task<ImageMetadata?> IdentifyAsync(Stream content)
    {
        try
        {
            using var image = Image.NewFromBuffer(ReadAllBytes(content));
            var loader = image.Get("vips-loader") as string;
            if (loader is null || !ContentTypesByLoader.TryGetValue(loader, out var contentType))
            {
                // Decoded, but not one of the formats this pipeline is willing to store (e.g.
                // SVG, TIFF, PDF thumbnails — anything libvips itself can open but that isn't a
                // web-safe stored-photo format here) — treated the same as "not a valid image".
                logger.LogInformation("Uploaded file decoded via unsupported loader {Loader}", loader);
                return Task.FromResult<ImageMetadata?>(null);
            }

            return Task.FromResult<ImageMetadata?>(new ImageMetadata(new ImageDimensions(image.Width, image.Height), contentType));
        }
        catch (VipsException ex)
        {
            logger.LogInformation(ex, "Could not identify uploaded file as a valid image");
            return Task.FromResult<ImageMetadata?>(null);
        }
    }

    public async Task<NormalizedImage> NormalizeAsync(Stream content, int maxLongEdge)
    {
        var bytes = ReadAllBytes(content);

        await _normalizationThrottle.WaitAsync();
        try
        {
            // width/height together define a bounding box libvips fits the image into
            // (Enums.Size.Down never upscales), aspect ratio preserved — the long edge ends up
            // at maxLongEdge, the short edge follows proportionally. Autorotate (the default —
            // no noRotate option passed) bakes EXIF orientation into the pixels so the stored
            // asset never displays rotated; strip:true on WriteToBuffer then drops all
            // metadata (EXIF/ICC/XMP, including any GPS tag) from the output in the same step.
            using var thumbnail = Image.ThumbnailBuffer(bytes, maxLongEdge, height: maxLongEdge, size: Enums.Size.Down);
            var outputBytes = thumbnail.WriteToBuffer(".jpg", new VOption { { "Q", 90 }, { "strip", true } });

            return new NormalizedImage(
                new MemoryStream(outputBytes), "image/jpeg", new ImageDimensions(thumbnail.Width, thumbnail.Height), outputBytes.LongLength);
        }
        finally
        {
            _normalizationThrottle.Release();
        }
    }

    private static byte[] ReadAllBytes(Stream content)
    {
        if (content is MemoryStream memoryStream) return memoryStream.ToArray();

        using var buffer = new MemoryStream();
        content.CopyTo(buffer);
        return buffer.ToArray();
    }
}
