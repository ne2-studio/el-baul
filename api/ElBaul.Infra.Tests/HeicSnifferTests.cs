using ElBaul.Infra.PhotoStorage;

namespace ElBaul.Infra.Tests;

public class HeicSnifferTests
{
    [Fact]
    public void IsHeic_ReturnsTrue_WhenTheMajorBrandIsHeic()
    {
        var header = BuildFtypBox("heic");

        Assert.True(HeicSniffer.IsHeic(header));
    }

    [Fact]
    public void IsHeic_ReturnsTrue_WhenHeicIsOnlyAmongTheCompatibleBrands()
    {
        // Real-world encoders often declare a generic major brand ("mif1") and list "heic" only
        // among the compatible brands that follow — must still be detected.
        var header = BuildFtypBox("mif1", "mif1", "heic", "miaf");

        Assert.True(HeicSniffer.IsHeic(header));
    }

    [Fact]
    public void IsHeic_ReturnsFalse_ForAFtypBoxDeclaringAnUnrelatedBrand()
    {
        // "isom"/"mp42" are standard MP4 brands, not HEIC/HEIF ones.
        var header = BuildFtypBox("isom", "isom", "mp42");

        Assert.False(HeicSniffer.IsHeic(header));
    }

    [Theory]
    [InlineData("this is not an image at all")]
    [InlineData("\xFF\xD8\xFF\xE0")] // real JPEG SOI + APP0 marker bytes
    public void IsHeic_ReturnsFalse_ForContentWithNoFtypBox(string text)
    {
        var header = System.Text.Encoding.Latin1.GetBytes(text);

        Assert.False(HeicSniffer.IsHeic(header));
    }

    [Fact]
    public void IsHeic_ReturnsFalse_ForInputShorterThanAMinimalFtypBox()
    {
        Assert.False(HeicSniffer.IsHeic([0, 0, 0, 12, (byte)'f', (byte)'t']));
    }

    // Mirrors the exact ticket scenario: a real HEIC file whose client-declared filename/
    // content-type claim it's a JPEG must still be recognized as HEIC — but since detection is
    // now purely byte-based, there's no client-declared label to even construct here; this just
    // documents that IsHeic never takes one as input.
    [Fact]
    public void IsHeic_IgnoresNothingButTheBytes_ThereIsNoContentTypeOrFileNameParameter()
    {
        var header = BuildFtypBox("heic");

        Assert.True(HeicSniffer.IsHeic(header));
    }

    private static byte[] BuildFtypBox(string majorBrand, params string[] compatibleBrands)
    {
        var size = 16 + 4 * compatibleBrands.Length;
        var box = new List<byte>(size);
        box.AddRange(BigEndianUInt32(size));
        box.AddRange("ftyp"u8.ToArray());
        box.AddRange(System.Text.Encoding.ASCII.GetBytes(majorBrand));
        box.AddRange(BigEndianUInt32(0)); // minor_version
        foreach (var brand in compatibleBrands)
            box.AddRange(System.Text.Encoding.ASCII.GetBytes(brand));

        return box.ToArray();
    }

    private static byte[] BigEndianUInt32(int value) =>
    [
        (byte)(value >> 24), (byte)(value >> 16), (byte)(value >> 8), (byte)value,
    ];
}
