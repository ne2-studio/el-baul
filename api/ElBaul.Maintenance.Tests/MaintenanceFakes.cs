using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using ElBaul.Domain;
namespace ElBaul.Maintenance.Tests;

// Only the members BackfillChatMemoriesCommandTests actually needs vary; everything else gets
// a harmless placeholder value, same shape as ElBaul.Tests.Fakes.StaticAppConfiguration but
// local to this project (ElBaul.Maintenance.Tests doesn't reference ElBaul.Tests).
internal sealed class StaticAppConfiguration(bool chatMemoryEnabled = true) : IAppConfiguration
{
    public string PublicUrl => "https://el-baul.test";
    public string ApiPublicUrl => "https://api.el-baul.test";
    public string AdminTestEmailRecipient => "admin@el-baul.test";
    public string FunctionalTimeZoneId => "Europe/Madrid";
    public string HelpCenterUrl => "https://el-baul-web.test/ayuda";
    public string PrivacyPolicyUrl => "https://el-baul-web.test/legal/privacy-policy/";
    public bool WelcomeEmailsEnabled => true;
    public bool WeeklyDigestEmailsEnabled => true;
    public bool ChatEnabled => true;
    public bool ChatSuggestionsEnabled => true;
    public bool SharedLinksEnabled => true;
    public bool BaulFeedEnabled => true;
    public bool PushDigestEnabled => true;
    public bool ChatMemoryEnabled { get; } = chatMemoryEnabled;
    public int ChatMemoryRetrievalLimit => 5;
    public bool TvModeEnabled => true;
}

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
    public Task<IEnumerable<Photo>> GetAllByChapterIdAsync(ChapterId chapterId) => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<IEnumerable<Photo>> GetLooseByBaulIdAsync(BaulId baulId) => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<IEnumerable<Photo>> GetActiveByBaulIdAsync(BaulId baulId) => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<IEnumerable<Photo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since, UserId excludingUserId) => Task.FromResult(Enumerable.Empty<Photo>());
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
