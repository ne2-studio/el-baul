using ElBaul.Infra.Lite;
using ElBaul.Maintenance.Commands;
using ElBaul.Core.Photos.OutputPorts;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Maintenance.Tests;

public class BackfillPhotoMetadataCommandTests
{
    [Fact]
    public async Task RunAsync_WithDryRun_ReportsWithoutUpdatingPhotos()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var photo = await CreateDimensionlessPhotoAsync(photoRepository);
        var storage = new InMemoryMaintenancePhotoStorage();
        storage.Seed(photo.StorageKey, [1, 2, 3]);

        var command = Create(photoRepository, storage);

        var exitCode = await command.RunAsync(dryRun: true);

        var stored = await photoRepository.GetByIdAsync(photo.Id);
        Assert.Equal(0, exitCode);
        Assert.Equal(0, stored!.Width);
        Assert.Equal(0, stored.Height);
    }

    [Fact]
    public async Task RunAsync_FillsWidthHeightAndSizeBytes_ForPhotosMissingDimensions()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var photo = await CreateDimensionlessPhotoAsync(photoRepository);
        var storage = new InMemoryMaintenancePhotoStorage();
        storage.Seed(photo.StorageKey, [1, 2, 3]);

        var command = Create(photoRepository, storage);

        var exitCode = await command.RunAsync(dryRun: false);

        var stored = await photoRepository.GetByIdAsync(photo.Id);
        Assert.Equal(0, exitCode);
        // FakeImageProcessor reports every non-empty stream as 800x600 — see its own doc comment.
        Assert.Equal(800, stored!.Width);
        Assert.Equal(600, stored.Height);
        Assert.Equal(3, stored.SizeBytes);
    }

    [Fact]
    public async Task RunAsync_LeavesPhotosWithDimensionsAlone()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var withDimensions = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, new BaulId(Guid.NewGuid()), "photos/already-known.jpg", null,
            new UserId("user-1"), DateTime.UtcNow, width: 1200, height: 900);
        await photoRepository.CreateAsync(withDimensions);
        var storage = new InMemoryMaintenancePhotoStorage();

        var command = Create(photoRepository, storage);

        var exitCode = await command.RunAsync(dryRun: false);

        var stored = await photoRepository.GetByIdAsync(withDimensions.Id);
        Assert.Equal(0, exitCode);
        Assert.Equal(1200, stored!.Width);
        Assert.Equal(900, stored.Height);
    }

    [Fact]
    public async Task RunAsync_RespectsLimit()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var storage = new InMemoryMaintenancePhotoStorage();
        var first = await CreateDimensionlessPhotoAsync(photoRepository);
        var second = await CreateDimensionlessPhotoAsync(photoRepository);
        storage.Seed(first.StorageKey, [1, 2, 3]);
        storage.Seed(second.StorageKey, [1, 2, 3]);

        var command = new BackfillPhotoMetadataCommand(
            photoRepository, storage, new FakeImageProcessor(), new MaintenanceCommandArguments(["--limit", "1"]),
            NullLogger<BackfillPhotoMetadataCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        var stillMissing = await photoRepository.GetMissingDimensionsAsync();
        Assert.Equal(0, exitCode);
        Assert.Single(stillMissing);
    }

    [Fact]
    public async Task RunAsync_ReturnsFailure_WhenStoredObjectIsNotAValidImage()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var photo = await CreateDimensionlessPhotoAsync(photoRepository);
        var storage = new InMemoryMaintenancePhotoStorage();
        storage.Seed(photo.StorageKey, []);

        var command = Create(photoRepository, storage);

        var exitCode = await command.RunAsync(dryRun: false);

        var stored = await photoRepository.GetByIdAsync(photo.Id);
        // FakeImageProcessor treats empty content as unidentifiable — see its own doc comment.
        Assert.Equal(1, exitCode);
        Assert.Equal(0, stored!.Width);
    }

    [Fact]
    public async Task RunAsync_ReturnsFailure_WhenAStorageReadFails()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var photo = await CreateDimensionlessPhotoAsync(photoRepository);

        var command = Create(photoRepository, new FailingPhotoStorage());

        var exitCode = await command.RunAsync(dryRun: false);

        var stored = await photoRepository.GetByIdAsync(photo.Id);
        Assert.Equal(1, exitCode);
        Assert.Equal(0, stored!.Width);
    }

    private static BackfillPhotoMetadataCommand Create(IPhotoRepository photoRepository, IPhotoStorage storage) =>
        new(photoRepository, storage, new FakeImageProcessor(), new MaintenanceCommandArguments([]),
            NullLogger<BackfillPhotoMetadataCommand>.Instance);

    private static async Task<Photo> CreateDimensionlessPhotoAsync(InMemoryPhotoRepository repository)
    {
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, new BaulId(Guid.NewGuid()), $"photos/{Guid.NewGuid()}.jpg", null,
            new UserId("user-1"), DateTime.UtcNow);
        await repository.CreateAsync(photo);
        return photo;
    }
}
