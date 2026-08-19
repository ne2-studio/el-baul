using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

/// <summary>
/// Stand-in for VipsImageProcessor. el-baul-api-lite and ElBaul.Tests exercise upload plumbing
/// with tiny placeholder byte content that isn't a real decodable image, so this reports every
/// non-empty input as already compliant with ImagePolicy's default resolution limits and passes
/// NormalizeAsync through unchanged — normalization is never actually exercised through this
/// fake. Real resize/identify behavior against real pixels is covered by
/// ElBaul.Infra.Tests (VipsImageProcessorTests) against the real NetVips implementation.
/// </summary>
public class FakeImageProcessor : IImageProcessor
{
    public Task<ImageMetadata?> IdentifyAsync(Stream content) =>
        Task.FromResult<ImageMetadata?>(content.Length == 0 ? null : new ImageMetadata(new ImageDimensions(800, 600), "image/jpeg"));

    public Task<NormalizedImage> NormalizeAsync(Stream content, int maxLongEdge)
    {
        using var buffer = new MemoryStream();
        content.CopyTo(buffer);
        var bytes = buffer.ToArray();
        return Task.FromResult(new NormalizedImage(new MemoryStream(bytes), "image/jpeg", new ImageDimensions(maxLongEdge, maxLongEdge), bytes.LongLength));
    }
}
