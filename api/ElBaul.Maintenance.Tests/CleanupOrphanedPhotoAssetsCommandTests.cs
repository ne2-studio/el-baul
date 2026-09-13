using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Infra.Lite;
using ElBaul.Maintenance.Commands;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Maintenance.Tests;

// Minimal local fake — ElBaul.Core.Tests' FakePhotoStorage isn't visible from this project (no
// project reference between test projects, see docs/architecture/backend.md).
internal sealed class FakePhotoStorage : IPhotoStorage
{
    public List<string> DeletedKeys { get; } = [];
    public Task SaveAsync(string key, Stream content, string contentType) => Task.CompletedTask;
    public Task<PhotoContent> OpenReadForDownloadAsync(string key) => throw new NotSupportedException();
    public Task<string> GetImageUrl(string key, ImagePlacement placement, ImageCrop? crop = null, ImageDimensions? sourceDimensions = null) =>
        Task.FromResult($"https://imgproxy.test/{placement}/{key}");
    public Task DeleteAsync(string key)
    {
        DeletedKeys.Add(key);
        return Task.CompletedTask;
    }
    public Task EnsureBucketExistsAsync() => Task.CompletedTask;
}

// Slice 3 (docs/.backlog issue #62): the garbage collection every "PhotoAsset lifetime is
// decoupled from Photo lifetime" comment across the codebase has been pointing at since Slice 2.
public class CleanupOrphanedPhotoAssetsCommandTests
{
    private readonly InMemoryPhotoRepository _photos = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly DateTime _now = new(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

    private CleanupOrphanedPhotoAssetsCommand CreateCommand() =>
        new(_photos, _photoStorage, new FixedClock(_now), NullLogger<CleanupOrphanedPhotoAssetsCommand>.Instance);

    private PhotoAsset SeedOldAsset(string storageKey, TimeSpan? age = null)
    {
        var createdAt = _now - (age ?? CleanupOrphanedPhotoAssetsCommand.GracePeriod - TimeSpan.FromMinutes(1)) - TimeSpan.FromHours(1);
        var asset = PhotoAsset.Create(
            new PhotoAssetId(Guid.NewGuid()), storageKey, new ImageDimensions(10, 10), createdAt, new UserId("user-1"));
        return asset;
    }

    [Fact]
    public async Task RunAsync_DeletesAnAssetWithNoPhotoAndNoUserPhotoAsset()
    {
        var asset = SeedOldAsset("orphan.jpg");
        await _photos.TryCreateAssetAsync(asset);

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        Assert.Null(await _photos.GetAssetByIdAsync(asset.Id));
        Assert.Equal(["orphan.jpg"], _photoStorage.DeletedKeys);
    }

    [Fact]
    public async Task RunAsync_NeverDeletesAnAssetWithAUserPhotoAssetRelation_EvenWithZeroPhotos()
    {
        // Exactly the state a direct Mis fotos upload leaves behind (Slice 3) — must never be
        // treated as orphaned.
        var asset = SeedOldAsset("mis-fotos-only.jpg");
        await _photos.TryCreateAssetAsync(asset);
        await _photos.TryCreateUserPhotoAssetAsync(new UserId("user-1"), asset.Id, _now - TimeSpan.FromDays(2));

        await CreateCommand().RunAsync(dryRun: false);

        Assert.NotNull(await _photos.GetAssetByIdAsync(asset.Id));
        Assert.Empty(_photoStorage.DeletedKeys);
    }

    [Fact]
    public async Task RunAsync_NeverDeletesAnAssetStillReferencedByAPhoto()
    {
        var asset = SeedOldAsset("still-referenced.jpg");
        await _photos.TryCreateAssetAsync(asset);
        var photo = Photo.CreateFromExistingAsset(
            new PhotoId(asset.Id.Value), new BaulId(Guid.NewGuid()), asset, null, new UserId("user-1"), asset.CreatedAt);
        await _photos.TryAddExistingAssetAsync(photo);

        await CreateCommand().RunAsync(dryRun: false);

        Assert.NotNull(await _photos.GetAssetByIdAsync(asset.Id));
        Assert.Empty(_photoStorage.DeletedKeys);
    }

    [Fact]
    public async Task RunAsync_DeletesAnAssetWhoseOnlyPhotoWasHardDeleted()
    {
        // Mirrors PhotoRepository.DeleteAsync's own doc comment: the admin hard-delete path
        // leaves an intentional orphan behind once the last referencing Photo row is gone — this
        // command is what's expected to eventually clean it up.
        var asset = SeedOldAsset("last-photo-hard-deleted.jpg");
        await _photos.TryCreateAssetAsync(asset);
        var photo = Photo.CreateFromExistingAsset(
            new PhotoId(asset.Id.Value), new BaulId(Guid.NewGuid()), asset, null, new UserId("user-1"), asset.CreatedAt);
        await _photos.TryAddExistingAssetAsync(photo);
        await _photos.DeleteAsync(photo.Id);

        await CreateCommand().RunAsync(dryRun: false);

        Assert.Null(await _photos.GetAssetByIdAsync(asset.Id));
        Assert.Equal(["last-photo-hard-deleted.jpg"], _photoStorage.DeletedKeys);
    }

    [Fact]
    public async Task RunAsync_NeverDeletesAnAssetYoungerThanTheGracePeriod()
    {
        var asset = SeedOldAsset("just-created.jpg", age: TimeSpan.Zero);
        await _photos.TryCreateAssetAsync(asset);

        await CreateCommand().RunAsync(dryRun: false);

        Assert.NotNull(await _photos.GetAssetByIdAsync(asset.Id));
        Assert.Empty(_photoStorage.DeletedKeys);
    }

    [Fact]
    public async Task RunAsync_DryRun_DeletesNothing()
    {
        var asset = SeedOldAsset("dry-run.jpg");
        await _photos.TryCreateAssetAsync(asset);

        await CreateCommand().RunAsync(dryRun: true);

        Assert.NotNull(await _photos.GetAssetByIdAsync(asset.Id));
        Assert.Empty(_photoStorage.DeletedKeys);
    }
}
