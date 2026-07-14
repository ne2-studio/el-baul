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
    Task<string> GetImageUrl(string key, ImagePlacement placement);
    Task DeleteAsync(string key);
    Task EnsureBucketExistsAsync();
}
