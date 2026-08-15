using ElBaul.Infra.Lite;
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
    public bool MaintenanceModeEnabled => false;
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
    public Task<IEnumerable<Photo>> GetMissingDimensionsAsync() => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<IEnumerable<Photo>> GetOversizedAsync(int maxLongEdge) => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<IEnumerable<Photo>> GetMissingUploadBatchIdAsync() => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<IEnumerable<Photo>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take) => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<IEnumerable<Photo>> GetAllByBaulIdAsync(BaulId baulId) => Task.FromResult(Enumerable.Empty<Photo>());
    public Task<Photo?> GetActiveByContentHashAsync(BaulId baulId, string originalContentHash) => Task.FromResult<Photo?>(null);
    public Task<IEnumerable<Photo>> GetMissingContentHashAsync() => throw new InvalidOperationException("database unavailable");
    public Task<IEnumerable<Photo>> GetActiveWithContentHashAsync() => throw new InvalidOperationException("database unavailable");
    public Task CreateAsync(Photo photo) => Task.CompletedTask;
    public Task<bool> TryCreateActiveAsync(Photo photo) => Task.FromResult(true);
    public Task<bool> TrySetContentHashAsync(PhotoId photoId, BaulId baulId, string originalContentHash) =>
        throw new InvalidOperationException("database unavailable");
    public Task UpdateAsync(Photo photo) => Task.CompletedTask;
    public Task DeleteAsync(PhotoId id) => Task.CompletedTask;
    public Task DeleteByBaulIdAsync(BaulId baulId) => Task.CompletedTask;
}

internal sealed class FixedClock(DateTime now) : IClock
{
    public DateTime UtcNow() => now;
}

/// <summary>Test-local IImageProcessor double for BackfillNormalizePhotosCommandTests — maps
/// each seeded key's stored bytes to a canned ImageMetadata, so a test controls exactly what
/// "the actual stored asset" looks like independently of what's persisted on the Photo row
/// (the distinction the command's own idempotency/self-heal behavior depends on).</summary>
internal sealed class StubImageProcessor : IImageProcessor
{
    private readonly Dictionary<byte[], ImageMetadata?> _metadataByContent = new();
    private readonly HashSet<byte[]> _throwOnNormalize = new();

    public void Seed(byte[] content, ImageMetadata? metadata) => _metadataByContent[content] = metadata;

    public void ThrowOnNormalize(byte[] content) => _throwOnNormalize.Add(content);

    public Task<ImageMetadata?> IdentifyAsync(Stream content)
    {
        var bytes = ToBytes(content);
        var match = _metadataByContent.Keys.FirstOrDefault(k => k.SequenceEqual(bytes));
        return Task.FromResult(match is null ? null : _metadataByContent[match]);
    }

    public Task<NormalizedImage> NormalizeAsync(Stream content, int maxLongEdge)
    {
        var bytes = ToBytes(content);
        if (_throwOnNormalize.Any(k => k.SequenceEqual(bytes)))
            throw new InvalidOperationException("simulated normalization failure");

        // Deterministic stand-in for a real resize: halves both dimensions, well under any
        // maxLongEdge these tests use, and shrinks the byte payload so "bytes saved" is
        // observable without needing a real codec.
        return Task.FromResult(new NormalizedImage(
            new MemoryStream(bytes.Take(Math.Max(1, bytes.Length / 2)).ToArray()), "image/jpeg", maxLongEdge / 2, maxLongEdge / 2,
            Math.Max(1, bytes.LongLength / 2)));
    }

    private static byte[] ToBytes(Stream content)
    {
        using var buffer = new MemoryStream();
        content.CopyTo(buffer);
        return buffer.ToArray();
    }
}

internal sealed class UpdateFailsPhotoRepository(InMemoryPhotoRepository inner) : IPhotoRepository
{
    public Task<Photo?> GetByIdAsync(PhotoId id) => inner.GetByIdAsync(id);
    public Task<IEnumerable<Photo>> GetByIdsAsync(IEnumerable<PhotoId> ids) => inner.GetByIdsAsync(ids);
    public Task<Photo?> GetByClientUploadIdAsync(Guid clientUploadId) => inner.GetByClientUploadIdAsync(clientUploadId);
    public Task<IEnumerable<Photo>> GetByChapterIdAsync(ChapterId chapterId) => inner.GetByChapterIdAsync(chapterId);
    public Task<IEnumerable<Photo>> GetAllByChapterIdAsync(ChapterId chapterId) => inner.GetAllByChapterIdAsync(chapterId);
    public Task<IEnumerable<Photo>> GetLooseByBaulIdAsync(BaulId baulId) => inner.GetLooseByBaulIdAsync(baulId);
    public Task<IEnumerable<Photo>> GetActiveByBaulIdAsync(BaulId baulId) => inner.GetActiveByBaulIdAsync(baulId);
    public Task<IEnumerable<Photo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since, UserId excludingUserId) =>
        inner.GetCreatedSinceByBaulIdAsync(baulId, since, excludingUserId);
    public Task<IEnumerable<Photo>> GetPreviewPhotosAsync(BaulId baulId, int limit) => inner.GetPreviewPhotosAsync(baulId, limit);
    public Task<IEnumerable<Photo>> GetUndatedAsync() => inner.GetUndatedAsync();
    public Task<IEnumerable<Photo>> GetMissingSizeBytesAsync() => inner.GetMissingSizeBytesAsync();
    public Task<IEnumerable<Photo>> GetMissingDimensionsAsync() => inner.GetMissingDimensionsAsync();
    public Task<IEnumerable<Photo>> GetOversizedAsync(int maxLongEdge) => inner.GetOversizedAsync(maxLongEdge);
    public Task<IEnumerable<Photo>> GetMissingUploadBatchIdAsync() => inner.GetMissingUploadBatchIdAsync();
    public Task<IEnumerable<Photo>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take) =>
        inner.GetPageAsync(baulId, chapterId, skip, take);
    public Task<IEnumerable<Photo>> GetAllByBaulIdAsync(BaulId baulId) => inner.GetAllByBaulIdAsync(baulId);
    public Task<Photo?> GetActiveByContentHashAsync(BaulId baulId, string originalContentHash) => inner.GetActiveByContentHashAsync(baulId, originalContentHash);
    public Task<IEnumerable<Photo>> GetMissingContentHashAsync() => inner.GetMissingContentHashAsync();
    public Task<IEnumerable<Photo>> GetActiveWithContentHashAsync() => inner.GetActiveWithContentHashAsync();
    public Task CreateAsync(Photo photo) => inner.CreateAsync(photo);
    public Task<bool> TryCreateActiveAsync(Photo photo) => inner.TryCreateActiveAsync(photo);
    public Task<bool> TrySetContentHashAsync(PhotoId photoId, BaulId baulId, string originalContentHash) =>
        throw new InvalidOperationException("database unavailable");
    public Task UpdateAsync(Photo photo) => throw new InvalidOperationException("database unavailable");
    public Task DeleteAsync(PhotoId id) => inner.DeleteAsync(id);
    public Task DeleteByBaulIdAsync(BaulId baulId) => inner.DeleteByBaulIdAsync(baulId);
}
