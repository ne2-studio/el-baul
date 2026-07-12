using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Util;
using ElBaul.Ports.Output;
using Microsoft.Extensions.Options;

namespace ElBaul.Infra;

/// <summary>
/// Stores photos in MinIO (S3-compatible). Presigned GET URLs are generated against
/// the internal Docker-network endpoint (reachable from this container) then rewritten
/// to the public endpoint (reachable from the browser) via SignedUrlRewriter — the same
/// internal/public split the old Supabase-backed storage adapter used.
/// </summary>
public class MinioPhotoStorage : IPhotoStorage
{
    private readonly IAmazonS3 _client;
    private readonly StorageOptions _options;

    public MinioPhotoStorage(IOptions<StorageOptions> options)
    {
        _options = options.Value;
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

    public async Task<string> GetSignedUrlAsync(string key, TimeSpan expiresIn)
    {
        var internalUrl = await _client.GetPreSignedURLAsync(new GetPreSignedUrlRequest
        {
            BucketName = _options.BucketName,
            Key = key,
            Expires = DateTime.UtcNow.Add(expiresIn),
            Verb = HttpVerb.GET
        });

        return SignedUrlRewriter.Rewrite(internalUrl, _options.PublicEndpoint);
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
