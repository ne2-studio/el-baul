namespace ElBaul.Ports.Output;

/// <summary>
/// Object storage for uploaded photos (MinIO/S3 in Infra). Keys are opaque strings
/// chosen by the caller (Application layer); the storage never inspects them. Reads
/// never expose the underlying object storage directly — GetImageUrl returns a URL
/// through an image-resizing proxy (imgproxy in Infra), sized per placement.
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

    Task<string> GetImageUrl(string key, ImagePlacement placement);
    Task DeleteAsync(string key);
    Task EnsureBucketExistsAsync();
}
