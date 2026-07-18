namespace ElBaul.Ports.Output;

/// <summary>
/// Reads a capture date out of a photo's embedded metadata (EXIF). Never throws —
/// unsupported formats, missing tags, or corrupt files all just mean "no date found".
/// </summary>
public interface IPhotoDateExtractor
{
    (int Year, int Month, int Day)? TryExtractDate(Stream content);
}
