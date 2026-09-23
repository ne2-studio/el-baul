using System.Text;
using ElBaul.Infra.PhotoStorage;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Infra.Tests;

public class HeicToJpegPhotoImageNormalizerTests
{
    private readonly HeicToJpegPhotoImageNormalizer _normalizer = new(NullLogger<HeicToJpegPhotoImageNormalizer>.Instance);

    [Fact]
    public async Task NormalizeAsync_PassesThroughUntouched_WhenTheBytesAreNotHeic()
    {
        var bytes = Encoding.UTF8.GetBytes("not-a-real-image, and no ftyp box at all");
        using var content = new MemoryStream(bytes);

        var result = await _normalizer.NormalizeAsync(content);

        using var reader = new StreamReader(result.Content);
        Assert.Equal(Encoding.UTF8.GetString(bytes), await reader.ReadToEndAsync());
    }

    // Even bytes claiming (via an irrelevant, no-longer-accepted content-type/filename) to be
    // something else must still be treated purely on their own merits — this port doesn't even
    // have a contentType/fileName parameter to be misled by (see IPhotoImageNormalizer), so
    // there's nothing here to mislabel with.
    [Fact]
    public async Task NormalizeAsync_PassesNonHeicBytesThrough_RegardlessOfAnyExternalLabeling()
    {
        // A real, valid JPEG SOI+APP0 header — the kind of bytes a genuinely non-HEIC upload
        // would have, whatever its filename happened to be.
        var bytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, (byte)'J', (byte)'F', (byte)'I', (byte)'F' };
        using var content = new MemoryStream(bytes);

        var result = await _normalizer.NormalizeAsync(content);

        using var buffer = new MemoryStream();
        await result.Content.CopyToAsync(buffer);
        Assert.Equal(bytes, buffer.ToArray());
    }

    // This host has no `magick`/imagemagick-heic installed (that only ships in the api/
    // Dockerfile runtime image), so a genuine HEIC signature always hits the
    // conversion-failure fallback here — which is exactly the "never throws" behavior under
    // test. Real HEIC->JPEG conversion is only exercisable against the built Docker image
    // (backend-acceptance / manual testing).
    [Fact]
    public async Task NormalizeAsync_ShouldFallBackToOriginalBytes_WhenConversionFails_ForRealHeicSignatureBytes()
    {
        var originalBytes = BuildHeicFtypBox().Concat("not-a-real-heic-body"u8.ToArray()).ToArray();
        using var content = new MemoryStream(originalBytes);

        var result = await _normalizer.NormalizeAsync(content);

        using var buffer = new MemoryStream();
        await result.Content.CopyToAsync(buffer);
        Assert.Equal(originalBytes, buffer.ToArray());
    }

    // The exact scenario the ticket calls out: a real HEIC file whose client-declared
    // extension/content-type claim it's a .jpg must still be detected and (attempted to be)
    // converted, purely because its bytes start with a HEIC ftyp box — there's no
    // filename/content-type parameter here at all for a client to lie about anymore.
    [Fact]
    public async Task NormalizeAsync_DetectsHeicByItsBytes_EvenThoughNothingHereCouldEverClaimOtherwise()
    {
        var mislabeledHeicBytes = BuildHeicFtypBox().Concat("heic-payload-bytes"u8.ToArray()).ToArray();
        using var content = new MemoryStream(mislabeledHeicBytes);

        var result = await _normalizer.NormalizeAsync(content);

        // Conversion was attempted (and, per the comment above, failed in this environment) —
        // proven by HeicSniffer agreeing this is HEIC, the same check NormalizeAsync uses.
        Assert.True(HeicSniffer.IsHeic(mislabeledHeicBytes));
        using var buffer = new MemoryStream();
        await result.Content.CopyToAsync(buffer);
        Assert.Equal(mislabeledHeicBytes, buffer.ToArray());
    }

    private static byte[] BuildHeicFtypBox()
    {
        // size(4) + "ftyp"(4) + major_brand "heic"(4) + minor_version(4)
        return
        [
            0, 0, 0, 16,
            (byte)'f', (byte)'t', (byte)'y', (byte)'p',
            (byte)'h', (byte)'e', (byte)'i', (byte)'c',
            0, 0, 0, 0,
        ];
    }
}
