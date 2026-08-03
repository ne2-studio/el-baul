using System.Text;
using ElBaul.Infra.PhotoStorage;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Infra.Tests;

public class HeicToJpegPhotoImageNormalizerTests
{
    private readonly HeicToJpegPhotoImageNormalizer _normalizer = new(NullLogger<HeicToJpegPhotoImageNormalizer>.Instance);

    [Theory]
    [InlineData("image/jpeg", "foto.jpg")]
    [InlineData("image/png", "foto.png")]
    public async Task NormalizeAsync_ShouldPassThroughUntouched_ForNonHeicInput(string contentType, string fileName)
    {
        using var content = new MemoryStream(Encoding.UTF8.GetBytes("not-a-real-image"));

        var result = await _normalizer.NormalizeAsync(content, contentType, fileName);

        Assert.Same(content, result.Content);
        Assert.Equal(contentType, result.ContentType);
        Assert.Equal(fileName, result.FileName);
    }

    // This host has no `magick`/imagemagick-heic installed (that only ships in the api/
    // Dockerfile runtime image), so HEIC input always hits the conversion-failure fallback here
    // — which is exactly the "never throws" behavior under test. Real HEIC->JPEG conversion is
    // only exercisable against the built Docker image (backend-acceptance / manual testing).
    [Theory]
    [InlineData("image/heic", "foto.heic")]
    [InlineData("image/heif", "foto.heif")]
    [InlineData("application/octet-stream", "IMG_1234.HEIC")]
    public async Task NormalizeAsync_ShouldFallBackToOriginalBytes_WhenConversionFails(string contentType, string fileName)
    {
        var originalBytes = Encoding.UTF8.GetBytes("not-a-real-heic-file");
        using var content = new MemoryStream(originalBytes);

        var result = await _normalizer.NormalizeAsync(content, contentType, fileName);

        Assert.Equal(contentType, result.ContentType);
        Assert.Equal(fileName, result.FileName);
        using var reader = new StreamReader(result.Content);
        Assert.Equal("not-a-real-heic-file", await reader.ReadToEndAsync());
    }
}
