using ElBaul.Application.Photos;
using ElBaul.Infra.Lite;
using ElBaul.Maintenance.Commands;
using ElBaul.OutputPorts.Photos;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Maintenance.Tests;

public class BackfillNormalizePhotosCommandTests
{
    private static readonly ImagePolicy Policy = new(); // MaxStoredLongEdge = 4096

    [Fact]
    public async Task RunAsync_SkipsCompliantPhotos()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var compliant = await CreatePhotoAsync(photoRepository, "photos/compliant.jpg", 1200, 900, 1000);
        var storage = new InMemoryMaintenancePhotoStorage();
        var imageProcessor = new StubImageProcessor();

        var command = Create(photoRepository, storage, imageProcessor);

        var exitCode = await command.RunAsync(dryRun: false);

        var stored = await photoRepository.GetByIdAsync(compliant.Id);
        Assert.Equal(0, exitCode);
        Assert.Equal(1200, stored!.Width);
        Assert.False(stored.WasResized);
    }

    [Fact]
    public async Task RunAsync_Normalizes_OversizedPhoto()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var oversized = await CreatePhotoAsync(photoRepository, "photos/oversized.jpg", 12000, 9000, 10_000);
        var storage = new InMemoryMaintenancePhotoStorage();
        var storedBytes = new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 };
        storage.Seed(oversized.StorageKey, storedBytes);

        var imageProcessor = new StubImageProcessor();
        imageProcessor.Seed(storedBytes, new ImageMetadata(12000, 9000));

        var command = Create(photoRepository, storage, imageProcessor);

        var exitCode = await command.RunAsync(dryRun: false);

        var stored = await photoRepository.GetByIdAsync(oversized.Id);
        Assert.Equal(0, exitCode);
        Assert.True(stored!.WasResized);
        Assert.Equal(12000, stored.OriginalWidth);
        Assert.Equal(9000, stored.OriginalHeight);
        Assert.Equal(10_000, stored.OriginalSizeBytes);
        // StubImageProcessor.NormalizeAsync halves maxLongEdge (Policy.MaxStoredLongEdge = 4096).
        Assert.Equal(2048, stored.Width);
        Assert.Equal(2048, stored.Height);
        Assert.Equal(4, stored.SizeBytes);

        var storedContent = await storage.OpenReadAsync(oversized.StorageKey);
        using var buffer = new MemoryStream();
        await storedContent.CopyToAsync(buffer);
        Assert.Equal(4, buffer.Length);
    }

    [Fact]
    public async Task RunAsync_TwiceInARow_OnlyNormalizesOnce()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var oversized = await CreatePhotoAsync(photoRepository, "photos/twice.jpg", 12000, 9000, 10_000);
        var storage = new InMemoryMaintenancePhotoStorage();
        var storedBytes = new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 };
        storage.Seed(oversized.StorageKey, storedBytes);

        var imageProcessor = new StubImageProcessor();
        imageProcessor.Seed(storedBytes, new ImageMetadata(12000, 9000));

        var firstRun = await Create(photoRepository, storage, imageProcessor).RunAsync(dryRun: false);
        Assert.Equal(0, firstRun);

        // Second run against the now-normalized row: GetOversizedAsync no longer selects it at
        // all (Width/Height already <= MaxStoredLongEdge), so nothing is processed a second time.
        var secondRun = await Create(photoRepository, storage, imageProcessor).RunAsync(dryRun: false);
        Assert.Equal(0, secondRun);

        var candidatesAfter = await photoRepository.GetOversizedAsync(Policy.MaxStoredLongEdge);
        Assert.Empty(candidatesAfter);
    }

    [Fact]
    public async Task RunAsync_SelfHeals_WhenStoredAssetIsAlreadyCompliantButRowIsStale()
    {
        // Simulates a prior run that replaced the storage object but whose own DB update then
        // failed: the row still looks oversized, but the actual stored bytes are already
        // compliant. The command must re-derive from the live asset, not the stale row, and
        // must not treat this as a fresh normalization (no Original* set).
        var photoRepository = new InMemoryPhotoRepository();
        var stale = await CreatePhotoAsync(photoRepository, "photos/stale.jpg", 8000, 6000, 10_000);
        var storage = new InMemoryMaintenancePhotoStorage();
        var actualBytes = new byte[] { 9, 9, 9 };
        storage.Seed(stale.StorageKey, actualBytes);

        var imageProcessor = new StubImageProcessor();
        imageProcessor.Seed(actualBytes, new ImageMetadata(2000, 1500));

        var command = Create(photoRepository, storage, imageProcessor);

        var exitCode = await command.RunAsync(dryRun: false);

        var stored = await photoRepository.GetByIdAsync(stale.Id);
        Assert.Equal(0, exitCode);
        Assert.Equal(2000, stored!.Width);
        Assert.Equal(1500, stored.Height);
        // Repaired metadata, not a normalization event.
        Assert.False(stored.WasResized);
    }

    [Fact]
    public async Task RunAsync_LeavesOriginalAssetValid_WhenNormalizationFails()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var oversized = await CreatePhotoAsync(photoRepository, "photos/fails.jpg", 12000, 9000, 10_000);
        var storage = new InMemoryMaintenancePhotoStorage();
        var storedBytes = new byte[] { 1, 2, 3, 4 };
        storage.Seed(oversized.StorageKey, storedBytes);

        var imageProcessor = new StubImageProcessor();
        imageProcessor.Seed(storedBytes, new ImageMetadata(12000, 9000));
        imageProcessor.ThrowOnNormalize(storedBytes);

        var command = Create(photoRepository, storage, imageProcessor);

        var exitCode = await command.RunAsync(dryRun: false);

        var stored = await photoRepository.GetByIdAsync(oversized.Id);
        var stillStored = await storage.OpenReadAsync(oversized.StorageKey);
        using var buffer = new MemoryStream();
        await stillStored.CopyToAsync(buffer);

        Assert.Equal(1, exitCode);
        Assert.False(stored!.WasResized);
        Assert.Equal(12000, stored.Width);
        Assert.Equal(storedBytes, buffer.ToArray());
    }

    [Fact]
    public async Task RunAsync_DoesNotDestroyStorage_WhenDatabaseUpdateFails()
    {
        var innerRepository = new InMemoryPhotoRepository();
        var oversized = await CreatePhotoAsync(innerRepository, "photos/db-fails.jpg", 12000, 9000, 10_000);
        var storage = new InMemoryMaintenancePhotoStorage();
        var storedBytes = new byte[] { 1, 2, 3, 4, 5, 6 };
        storage.Seed(oversized.StorageKey, storedBytes);

        var imageProcessor = new StubImageProcessor();
        imageProcessor.Seed(storedBytes, new ImageMetadata(12000, 9000));

        var failingRepository = new UpdateFailsPhotoRepository(innerRepository);
        var command = Create(failingRepository, storage, imageProcessor);

        var exitCode = await command.RunAsync(dryRun: false);

        // Storage was already replaced with the smaller, valid asset before UpdateAsync threw
        // — the photo is still downloadable/viewable, just with a stale DB row, never a
        // destroyed one.
        var stillStored = await storage.OpenReadAsync(oversized.StorageKey);
        using var buffer = new MemoryStream();
        await stillStored.CopyToAsync(buffer);

        Assert.Equal(1, exitCode);
        Assert.Equal(3, buffer.Length);
        var staleRow = await innerRepository.GetByIdAsync(oversized.Id);
        Assert.Equal(12000, staleRow!.Width);
    }

    [Fact]
    public async Task RunAsync_WithDryRun_DoesNotModifyAnything()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var oversized = await CreatePhotoAsync(photoRepository, "photos/dry-run.jpg", 12000, 9000, 10_000);
        var storage = new InMemoryMaintenancePhotoStorage();
        storage.Seed(oversized.StorageKey, [1, 2, 3, 4]);

        var command = Create(photoRepository, storage, new StubImageProcessor());

        var exitCode = await command.RunAsync(dryRun: true);

        var stored = await photoRepository.GetByIdAsync(oversized.Id);
        Assert.Equal(0, exitCode);
        Assert.Equal(12000, stored!.Width);
        Assert.False(stored.WasResized);
    }

    [Fact]
    public async Task RunAsync_RespectsLimit()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var storage = new InMemoryMaintenancePhotoStorage();
        var imageProcessor = new StubImageProcessor();

        var first = await CreatePhotoAsync(photoRepository, "photos/one.jpg", 12000, 9000, 10_000);
        var second = await CreatePhotoAsync(photoRepository, "photos/two.jpg", 12000, 9000, 10_000);
        foreach (var photo in new[] { first, second })
        {
            var bytes = System.Text.Encoding.UTF8.GetBytes(photo.StorageKey);
            storage.Seed(photo.StorageKey, bytes);
            imageProcessor.Seed(bytes, new ImageMetadata(12000, 9000));
        }

        var command = new BackfillNormalizePhotosCommand(
            photoRepository, storage, imageProcessor, Policy, new MaintenanceCommandArguments(["--limit", "1"]),
            NullLogger<BackfillNormalizePhotosCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        var stillOversized = await photoRepository.GetOversizedAsync(Policy.MaxStoredLongEdge);
        Assert.Equal(0, exitCode);
        Assert.Single(stillOversized);
    }

    private static BackfillNormalizePhotosCommand Create(
        IPhotoRepository photoRepository, IPhotoStorage storage, IImageProcessor imageProcessor) =>
        new(photoRepository, storage, imageProcessor, Policy, new MaintenanceCommandArguments([]),
            NullLogger<BackfillNormalizePhotosCommand>.Instance);

    private static async Task<Photo> CreatePhotoAsync(
        InMemoryPhotoRepository repository, string storageKey, int width, int height, long sizeBytes)
    {
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, new BaulId(Guid.NewGuid()), storageKey, null,
            new UserId("user-1"), DateTime.UtcNow, width: width, height: height) with
        {
            SizeBytes = sizeBytes
        };
        await repository.CreateAsync(photo);
        return photo;
    }
}
