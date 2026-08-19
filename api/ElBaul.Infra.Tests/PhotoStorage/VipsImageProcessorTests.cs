using ElBaul.Infra.PhotoStorage;
using Microsoft.Extensions.Logging.Abstractions;
using NetVips;

namespace ElBaul.Infra.Tests.PhotoStorage;

public class VipsImageProcessorTests
{
    private readonly VipsImageProcessor _processor = new(NullLogger<VipsImageProcessor>.Instance);

    [Theory]
    [InlineData(4000, 3000)]
    [InlineData(200, 100)]
    public async Task IdentifyAsync_ReturnsTheRealPixelDimensions(int width, int height)
    {
        using var content = new MemoryStream(CreateJpeg(width, height));

        var metadata = await _processor.IdentifyAsync(content);

        Assert.NotNull(metadata);
        Assert.Equal(width, metadata!.Dimensions.Width);
        Assert.Equal(height, metadata.Dimensions.Height);
    }

    [Fact]
    public async Task IdentifyAsync_ReturnsNull_ForContentThatIsNotAnImage()
    {
        using var content = new MemoryStream("this is not an image"u8.ToArray());

        var metadata = await _processor.IdentifyAsync(content);

        Assert.Null(metadata);
    }

    [Fact]
    public async Task NormalizeAsync_LimitsTheLongEdge_PreservingAspectRatio()
    {
        using var content = new MemoryStream(CreateJpeg(12000, 9000));

        var result = await _processor.NormalizeAsync(content, 4096);

        // Matches the ticket's own worked example exactly.
        Assert.Equal(4096, result.Dimensions.Width);
        Assert.Equal(3072, result.Dimensions.Height);

        using var written = Image.NewFromBuffer(await ReadAllBytesAsync(result.Content));
        Assert.Equal(4096, written.Width);
        Assert.Equal(3072, written.Height);
    }

    [Fact]
    public async Task NormalizeAsync_NeverUpscales()
    {
        using var content = new MemoryStream(CreateJpeg(800, 600));

        var result = await _processor.NormalizeAsync(content, 4096);

        Assert.Equal(800, result.Dimensions.Width);
        Assert.Equal(600, result.Dimensions.Height);
    }

    [Fact]
    public async Task NormalizeAsync_StripsMetadata()
    {
        using var raw = Image.Black(800, 600);
        using var withOrientation = raw.Mutate(m => m.Set(GValue.GStrType, "exif-ifd0-Orientation", "1"));
        var bytes = withOrientation.WriteToBuffer(".jpg", new VOption { { "Q", 90 } });
        using var content = new MemoryStream(bytes);

        var result = await _processor.NormalizeAsync(content, 400);

        using var written = Image.NewFromBuffer(await ReadAllBytesAsync(result.Content));
        var fields = written.GetFields();
        Assert.DoesNotContain(fields, f => f.Contains("gps", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(fields, f => f.Contains("exif", StringComparison.OrdinalIgnoreCase));
    }

    private static byte[] CreateJpeg(int width, int height)
    {
        using var image = Image.Black(width, height);
        return image.WriteToBuffer(".jpg", new VOption { { "Q", 85 } });
    }

    private static async Task<byte[]> ReadAllBytesAsync(Stream stream)
    {
        stream.Position = 0;
        using var buffer = new MemoryStream();
        await stream.CopyToAsync(buffer);
        return buffer.ToArray();
    }
}
