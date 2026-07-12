namespace ElBaul.Ports.Output;

/// <summary>
/// Object storage for uploaded photos (MinIO/S3 in Infra). Keys are opaque strings
/// chosen by the caller (Application layer); the storage never inspects them.
/// </summary>
public interface IPhotoStorage
{
    Task SaveAsync(string key, Stream content, string contentType);
    Task<string> GetSignedUrlAsync(string key, TimeSpan expiresIn);
    Task EnsureBucketExistsAsync();
}
