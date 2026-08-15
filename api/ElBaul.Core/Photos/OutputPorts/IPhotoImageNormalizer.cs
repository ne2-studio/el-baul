namespace ElBaul.Core.Photos.OutputPorts;
public record NormalizedPhoto(Stream Content, string ContentType, string FileName);

/// <summary>
/// Re-encodes photo formats browsers can't render inline (HEIC/HEIF, as shot by iPhones) into
/// JPEG before storage, so every stored photo is directly displayable regardless of source
/// format. Formats that are already web-safe pass through untouched. Never throws — a failed
/// conversion falls back to the original bytes/content type rather than failing the upload.
/// </summary>
public interface IPhotoImageNormalizer
{
    Task<NormalizedPhoto> NormalizeAsync(Stream content, string contentType, string fileName);
}
