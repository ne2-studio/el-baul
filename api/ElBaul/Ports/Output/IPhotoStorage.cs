namespace ElBaul.Ports.Output;

public record PhotoContent(Stream Content, string ContentType);

/// <summary>
/// Object storage for uploaded photos (MinIO/S3 in Infra). Keys are opaque strings
/// chosen by the caller (Application layer); the storage never inspects them. Reads
/// mostly never expose the underlying object storage directly — GetImageUrl returns a
/// URL through an image-resizing proxy (imgproxy in Infra), sized per placement. The one
/// exception is OpenReadForDownloadAsync, used by the access-checked "download original"
/// endpoint, which needs the byte-exact original rather than an imgproxy re-encode.
/// </summary>
public interface IPhotoStorage
{
    Task SaveAsync(string key, Stream content, string contentType);

    /// <summary>
    /// Reads a stored photo's raw bytes back out. Server-side/tooling use only (e.g. the
    /// EXIF backfill command) — never exposed through the API, which always hands out a
    /// signed imgproxy URL instead (see GetImageUrl).
    /// </summary>
    Task<Stream> OpenReadAsync(string key);

    /// <summary>
    /// Reads a stored photo's raw bytes and original content type back out, for the
    /// authenticated "download original" endpoint (PhotoManager.DownloadAsync) — unlike
    /// OpenReadAsync's callers, this one does reach the API surface, always behind the
    /// same baúl-membership access check as every other photo read.
    /// </summary>
    Task<PhotoContent> OpenReadForDownloadAsync(string key);

    Task<string> GetImageUrl(string key, ImagePlacement placement);
    Task DeleteAsync(string key);
    Task EnsureBucketExistsAsync();
}
