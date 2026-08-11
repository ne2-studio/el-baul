using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using ElBaul.Domain;
namespace ElBaul.Maintenance.Tests;

internal sealed class InMemoryMaintenancePhotoStorage : IPhotoStorage
{
    private readonly Dictionary<string, byte[]> _objects = new();

    public void Seed(string key, byte[] content) => _objects[key] = content;

    public async Task SaveAsync(string key, Stream content, string contentType)
    {
        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer);
        _objects[key] = buffer.ToArray();
    }

    public Task<Stream> OpenReadAsync(string key) =>
        Task.FromResult<Stream>(new MemoryStream(_objects[key]));

    public Task<PhotoContent> OpenReadForDownloadAsync(string key) =>
        Task.FromResult(new PhotoContent(new MemoryStream(_objects[key]), "application/octet-stream"));

    public Task<string> GetImageUrl(string key, ImagePlacement placement, ImageCrop? crop = null) =>
        Task.FromResult($"https://imgproxy.test/{placement}/{key}");

    public Task DeleteAsync(string key)
    {
        _objects.Remove(key);
        return Task.CompletedTask;
    }

    public Task EnsureBucketExistsAsync() => Task.CompletedTask;
}

internal sealed class FailingPhotoStorage : IPhotoStorage
{
    public Task SaveAsync(string key, Stream content, string contentType) => Task.CompletedTask;
    public Task<Stream> OpenReadAsync(string key) => throw new InvalidOperationException("storage unavailable");
    public Task<PhotoContent> OpenReadForDownloadAsync(string key) => throw new InvalidOperationException("storage unavailable");
    public Task<string> GetImageUrl(string key, ImagePlacement placement, ImageCrop? crop = null) => Task.FromResult("");
    public Task DeleteAsync(string key) => Task.CompletedTask;
    public Task EnsureBucketExistsAsync() => Task.CompletedTask;
}

internal sealed class FailingPhotoRepository : IPhotoRepository
{
    public Task<Photo?> GetByIdAsync(PhotoId id) => throw new InvalidOperationException("database unavailable");
    public Task<IEnumerable<Photo>> GetByIdsAsync(IEnumerable<PhotoId> ids) => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<Photo?> GetByClientUploadIdAsync(Guid clientUploadId) => Task.FromResult<Photo?>(null);
    public Task<IEnumerable<Photo>> GetByChapterIdAsync(ChapterId chapterId) => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<IEnumerable<Photo>> GetLooseByBaulIdAsync(BaulId baulId) => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<IEnumerable<Photo>> GetActiveByBaulIdAsync(BaulId baulId) => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<IEnumerable<Photo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since, string excludingUserId) => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<IEnumerable<Photo>> GetPreviewPhotosAsync(BaulId baulId, int limit) => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<IEnumerable<Photo>> GetUndatedAsync() => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<IEnumerable<Photo>> GetMissingSizeBytesAsync() => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<IEnumerable<Photo>> GetMissingUploadBatchIdAsync() => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<IEnumerable<Photo>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take) => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<IEnumerable<Photo>> GetAllByBaulIdAsync(BaulId baulId) => Task.FromResult(Enumerable.Empty<Photo>());
    public Task CreateAsync(Photo photo) => Task.CompletedTask;
    public Task UpdateAsync(Photo photo) => Task.CompletedTask;
    public Task DeleteAsync(PhotoId id) => Task.CompletedTask;
    public Task DeleteByBaulIdAsync(BaulId baulId) => Task.CompletedTask;
}

internal sealed class FixedClock(DateTime now) : IClock
{
    public DateTime UtcNow() => now;
}
