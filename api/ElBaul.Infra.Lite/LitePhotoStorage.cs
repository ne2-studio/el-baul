using System.Collections.Concurrent;
using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

/// <summary>
/// In-memory stand-in for MinioPhotoStorage (ElBaul.Infra), used by the el-baul-api-lite
/// image. Unlike the real adapter, GetImageUrl can't hand out an imgproxy URL (there's no
/// imgproxy in this image) — it points at ElBaul.Api.Lite's own unauthenticated
/// GET /lite/photos/{key} endpoint instead, since the frontend renders photo URLs as plain
/// &lt;img src&gt; tags with no bearer token attached.
/// </summary>
public class LitePhotoStorage(IAppConfiguration appConfiguration) : IPhotoStorage
{
    private readonly ConcurrentDictionary<string, byte[]> _content = new();
    private readonly ConcurrentDictionary<string, string> _contentTypes = new();

    public async Task SaveAsync(string key, Stream content, string contentType)
    {
        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer);
        _content[key] = buffer.ToArray();
        _contentTypes[key] = contentType;
    }

    public Task<Stream> OpenReadAsync(string key) =>
        Task.FromResult<Stream>(new MemoryStream(_content.GetValueOrDefault(key, [])));

    public Task<PhotoContent> OpenReadForDownloadAsync(string key) =>
        Task.FromResult(new PhotoContent(
            new MemoryStream(_content.GetValueOrDefault(key, [])),
            _contentTypes.GetValueOrDefault(key, "application/octet-stream")));

    // Keys look like "{userId}/{uuid}-{filename}" — the literal '/' has to survive as a path
    // separator for ElBaul.Api.Lite's catch-all GET /lite/photos/{*key} route to bind the
    // whole thing back as one value, so each segment is escaped individually instead of
    // escaping the key as a single opaque string (which would turn '/' into %2F and never
    // decode back to a literal slash for route-parameter binding).
    public Task<string> GetImageUrl(string key, ImagePlacement placement) =>
        Task.FromResult($"{appConfiguration.ApiPublicUrl}/lite/photos/{string.Join('/', key.Split('/').Select(Uri.EscapeDataString))}");

    public Task DeleteAsync(string key)
    {
        _content.TryRemove(key, out _);
        _contentTypes.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    public Task EnsureBucketExistsAsync() => Task.CompletedTask;
}
