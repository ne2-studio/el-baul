using ElBaul.Infra.Lite;
using ElBaul.Maintenance.Commands;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Maintenance.Tests;

public class BackfillExifDatesCommandTests
{
    [Fact]
    public async Task RunAsync_WithDryRun_ReportsFoundDatesWithoutUpdatingPhotos()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var photo = await CreateUndatedPhotoAsync(photoRepository);
        var storage = new InMemoryMaintenancePhotoStorage();
        storage.Seed(photo.StorageKey, [1, 2, 3]);

        var command = new BackfillExifDatesCommand(
            photoRepository, storage, new FakePhotoDateExtractor((2024, 5, 6)),
            NullLogger<BackfillExifDatesCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: true);

        var stored = await photoRepository.GetByIdAsync(photo.Id);
        Assert.Equal(0, exitCode);
        Assert.Null(stored!.Date);
    }

    [Fact]
    public async Task RunAsync_UpdatesUndatedPhotosWhenExifDateExists()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var photo = await CreateUndatedPhotoAsync(photoRepository);
        var storage = new InMemoryMaintenancePhotoStorage();
        storage.Seed(photo.StorageKey, [1, 2, 3]);

        var command = new BackfillExifDatesCommand(
            photoRepository, storage, new FakePhotoDateExtractor((2024, 5, 6)),
            NullLogger<BackfillExifDatesCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        var stored = await photoRepository.GetByIdAsync(photo.Id);
        Assert.Equal(0, exitCode);
        Assert.Equal(2024, stored!.DateYear);
        Assert.Equal(5, stored.DateMonth);
        Assert.Equal(6, stored.DateDay);
    }

    [Fact]
    public async Task RunAsync_ReturnsFailureWhenAStorageReadFails()
    {
        var photoRepository = new InMemoryPhotoRepository();
        var photo = await CreateUndatedPhotoAsync(photoRepository);

        var command = new BackfillExifDatesCommand(
            photoRepository, new FailingPhotoStorage(), new FakePhotoDateExtractor((2024, 5, 6)),
            NullLogger<BackfillExifDatesCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        var stored = await photoRepository.GetByIdAsync(photo.Id);
        Assert.Equal(1, exitCode);
        Assert.Null(stored!.Date);
    }

    private static async Task<Photo> CreateUndatedPhotoAsync(InMemoryPhotoRepository repository)
    {
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, new BaulId(Guid.NewGuid()), "photos/one.jpg", null,
            "user-1", DateTime.UtcNow);
        await repository.CreateAsync(photo);
        return photo;
    }

    private sealed class FakePhotoDateExtractor((int Year, int Month, int Day)? date) : IPhotoDateExtractor
    {
        public (int Year, int Month, int Day)? TryExtractDate(Stream content) => date;
    }
}
