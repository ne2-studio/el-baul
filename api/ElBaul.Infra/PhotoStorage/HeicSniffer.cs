using System.Buffers.Binary;
using System.Text;

namespace ElBaul.Infra.PhotoStorage;

/// <summary>
/// Detects HEIC/HEIF content purely by sniffing the ISOBMFF `ftyp` box every such file starts
/// with — deliberately never by trusting a client-declared content-type or filename extension,
/// which a mislabeled or malicious upload can set to anything. See
/// HeicToJpegPhotoImageNormalizer, the only caller.
/// </summary>
public static class HeicSniffer
{
    private static readonly byte[] FtypMarker = "ftyp"u8.ToArray();

    // The ISO/IEC 14496-12 brand codes HEIF/HEIC files declare themselves under in their ftyp
    // box — covers still images (heic/heix/heim/heis/mif1/msf1) and image sequences
    // (hevc/hevx/hevm/hevs).
    private static readonly HashSet<string> HeicBrands = new(StringComparer.Ordinal)
    {
        "heic", "heix", "heim", "heis", "hevc", "hevx", "hevm", "hevs", "mif1", "msf1",
    };

    public static bool IsHeic(ReadOnlySpan<byte> header)
    {
        // A ftyp box is at minimum: 4-byte box size, the 4-byte literal "ftyp", then a 4-byte
        // major brand — anything shorter than that can't possibly be one.
        if (header.Length < 12 || !header.Slice(4, 4).SequenceEqual(FtypMarker)) return false;

        var boxSize = BinaryPrimitives.ReadUInt32BigEndian(header);
        var scanEnd = boxSize is > 0 and <= int.MaxValue ? Math.Min(header.Length, (int)boxSize) : header.Length;

        // Checks the major brand (bytes 8-12) and every compatible brand that follows (bytes
        // 16, 20, ...) — real-world HEIC encoders often declare a generic major brand (e.g.
        // "mif1") and list "heic" only among the compatible brands, so a major-brand-only check
        // would miss those files.
        for (var offset = 8; offset + 4 <= scanEnd; offset += 4)
        {
            if (HeicBrands.Contains(Encoding.ASCII.GetString(header.Slice(offset, 4))))
                return true;
        }

        return false;
    }
}
