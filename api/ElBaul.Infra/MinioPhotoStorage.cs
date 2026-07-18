using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Util;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Options;

namespace ElBaul.Infra;

/// <summary>
/// Stores photos in MinIO (S3-compatible), reachable only over the internal docker
/// network. Reads never touch MinIO directly or expose a MinIO URL — GetImageUrl
/// returns a signed imgproxy URL (see ImgproxyUrlBuilder); imgproxy itself has its own
/// S3 credentials and reads MinIO on this process's behalf.
/// </summary>
public class MinioPhotoStorage : IPhotoStorage
{
    private readonly IAmazonS3 _client;
    private readonly StorageOptions _options;
    private readonly ImgproxyOptions _imgproxyOptions;

    public MinioPhotoStorage(IOptions<StorageOptions> options, IOptions<ImgproxyOptions> imgproxyOptions)
    {
        _options = options.Value;
        _imgproxyOptions = imgproxyOptions.Value;
        _client = new AmazonS3Client(
            new BasicAWSCredentials(_options.AccessKey, _options.SecretKey),
            new AmazonS3Config
            {
                ServiceURL = _options.Endpoint,
                ForcePathStyle = true
            });
    }

    public async Task SaveAsync(string key, Stream content, string contentType)
    {
        await _client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _options.BucketName,
            Key = key,
            InputStream = content,
            ContentType = contentType
        });
    }

    public async Task<Stream> OpenReadAsync(string key)
    {
        using var response = await _client.GetObjectAsync(new GetObjectRequest
        {
            BucketName = _options.BucketName,
            Key = key
        });

        // Buffer fully rather than handing back response.ResponseStream directly — that
        // stream's lifetime is tied to the GetObjectResponse we're disposing here, and
        // photos are capped at 20MB on upload, so buffering is cheap.
        var buffer = new MemoryStream();
        await response.ResponseStream.CopyToAsync(buffer);
        buffer.Position = 0;
        return buffer;
    }

    public Task<string> GetImageUrl(string key, ImagePlacement placement) =>
        Task.FromResult(ImgproxyUrlBuilder.Build(_options.BucketName, key, placement, _imgproxyOptions));

    public async Task DeleteAsync(string key)
    {
        await _client.DeleteObjectAsync(new DeleteObjectRequest
        {
            BucketName = _options.BucketName,
            Key = key
        });
    }

    public async Task EnsureBucketExistsAsync()
    {
        var exists = await AmazonS3Util.DoesS3BucketExistV2Async(_client, _options.BucketName);
        if (!exists)
        {
            await _client.PutBucketAsync(_options.BucketName);
        }
    }
}
