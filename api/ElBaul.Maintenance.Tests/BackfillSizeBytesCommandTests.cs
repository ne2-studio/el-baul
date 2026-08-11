using ElBaul.Infra.Lite;
using ElBaul.Maintenance.Commands;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Maintenance.Tests;

public class BackfillSizeBytesCommandTests
{
    [Fact]
    public async Task RunAsync_WithDryRun_ReportsSizeWithoutUpdatingPhotos()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var photo = await CreateSizelessPhotoAsync(photoRepository);
        var storage = new InMemoryMaintenancePhotoStorage();
        storage.Seed(photo.StorageKey, [1, 2, 3]);

        var command = new BackfillSizeBytesCommand(photoRepository, storage, NullLogger<BackfillSizeBytesCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: true);

        var stored = await photoRepository.GetByIdAsync(photo.Id);
        Assert.Equal(0, exitCode);
        Assert.Equal(0, stored!.SizeBytes);
    }

    [Fact]
    public async Task RunAsync_UpdatesPhotosMissingSize()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var photo = await CreateSizelessPhotoAsync(photoRepository);
        var storage = new InMemoryMaintenancePhotoStorage();
        storage.Seed(photo.StorageKey, [1, 2, 3]);

        var command = new BackfillSizeBytesCommand(photoRepository, storage, NullLogger<BackfillSizeBytesCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        var stored = await photoRepository.GetByIdAsync(photo.Id);
        Assert.Equal(0, exitCode);
        Assert.Equal(3, stored!.SizeBytes);
    }

    [Fact]
    public async Task RunAsync_ReturnsFailureWhenAStorageReadFails()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var photo = await CreateSizelessPhotoAsync(photoRepository);

        var command = new BackfillSizeBytesCommand(photoRepository, new FailingPhotoStorage(), NullLogger<BackfillSizeBytesCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        var stored = await photoRepository.GetByIdAsync(photo.Id);
        Assert.Equal(1, exitCode);
        Assert.Equal(0, stored!.SizeBytes);
    }

    private static async Task<Photo> CreateSizelessPhotoAsync(InMemoryPhotoRepository repository)
    {
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, new BaulId(Guid.NewGuid()), "photos/one.jpg", null,
            "user-1", DateTime.UtcNow);
        await repository.CreateAsync(photo);
        return photo;
    }
}
