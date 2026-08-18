namespace ElBaul.Core.Photos.OutputPorts;
public record NormalizedPhoto(Stream Content);

/// <summary>
/// Re-encodes photo formats browsers can't render inline (HEIC/HEIF, as shot by iPhones) into
/// JPEG before storage, so every stored photo is directly displayable regardless of source
/// format. Whether content is HEIC/HEIF is decided purely by sniffing its bytes — never by a
/// client-declared content-type or filename, which this port doesn't even accept, precisely so
/// nothing upstream can influence that decision. Formats that are already web-safe pass through
/// untouched. Never throws — a failed conversion falls back to the original bytes rather than
/// failing the upload; IImageProcessor.IdentifyAsync downstream is what ultimately rejects
/// content it can't make sense of.
/// </summary>
public interface IPhotoImageNormalizer
{
    Task<NormalizedPhoto> NormalizeAsync(Stream content);
}
