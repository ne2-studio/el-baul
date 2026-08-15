using System.Security.Cryptography;
using ElBaul.Application.Photos;
using ElBaul.Infra.Lite;
using ElBaul.Maintenance.Commands;
using ElBaul.OutputPorts.Photos;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Maintenance.Tests;

public class BackfillPhotoContentHashesCommandTests
{
    private static string HashOf(byte[] bytes) => Convert.ToHexStringLower(SHA256.HashData(bytes));

    private static PhotoDuplicateMergeService CreateMergeService(
        InMemoryPhotoRepository photos, InMemoryChapterRepository chapters, InMemoryBaulRepository baules,
        InMemoryRecuerdoRepository recuerdos, InMemoryPhotoPersonaTagRepository tags, InMemorySharedLinkRepository sharedLinks) =>
        new(photos, chapters, baules, recuerdos, tags, sharedLinks,
            new PhotoLifecycleService(photos, chapters, baules, new FixedClock(DateTime.UtcNow)),
            new FakeUnitOfWork(), new FixedClock(DateTime.UtcNow));

    private static BackfillPhotoContentHashesCommand CreateCommand(
        InMemoryPhotoRepository photos, InMemoryMaintenancePhotoStorage storage, PhotoDuplicateMergeService? mergeService = null)
    {
        var chapters = new InMemoryChapterRepository();
        var baules = new InMemoryBaulRepository();
        var recuerdos = new InMemoryRecuerdoRepository();
        var tags = new InMemoryPhotoPersonaTagRepository();
        var sharedLinks = new InMemorySharedLinkRepository();
        return new BackfillPhotoContentHashesCommand(
            photos, storage, mergeService ?? CreateMergeService(photos, chapters, baules, recuerdos, tags, sharedLinks),
            NullLogger<BackfillPhotoContentHashesCommand>.Instance);
    }

    private static async Task<Photo> SeedPhotoAsync(
        InMemoryPhotoRepository repository, InMemoryMaintenancePhotoStorage storage, byte[] bytes,
        BaulId? baulId = null, string? existingHash = null, PhotoStatus status = PhotoStatus.Active)
    {
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId ?? new BaulId(Guid.NewGuid()), $"photos/{Guid.NewGuid()}.jpg", null,
            new UserId("user-1"), DateTime.UtcNow, originalContentHash: existingHash);
        if (status == PhotoStatus.Deleted) photo = photo.MarkDeleted("some reason", DateTime.UtcNow);
        await repository.CreateAsync(photo);
        storage.Seed(photo.StorageKey, bytes);
        return photo;
    }

    [Fact]
    public async Task RunAsync_WithDryRun_DoesNotPersistTheComputedHash()
    {
        var photos = new InMemoryPhotoRepository();
        var storage = new InMemoryMaintenancePhotoStorage();
        var bytes = new byte[] { 1, 2, 3 };
        var photo = await SeedPhotoAsync(photos, storage, bytes);

        var exitCode = await CreateCommand(photos, storage).RunAsync(dryRun: true);

        Assert.Equal(0, exitCode);
        var stored = await photos.GetByIdAsync(photo.Id);
        Assert.Null(stored!.OriginalContentHash);
    }

    [Fact]
    public async Task RunAsync_ComputesAndPersistsTheSha256OfTheStoredBytes()
    {
        var photos = new InMemoryPhotoRepository();
        var storage = new InMemoryMaintenancePhotoStorage();
        var bytes = new byte[] { 1, 2, 3, 4 };
        var photo = await SeedPhotoAsync(photos, storage, bytes);

        var exitCode = await CreateCommand(photos, storage).RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var stored = await photos.GetByIdAsync(photo.Id);
        Assert.Equal(HashOf(bytes), stored!.OriginalContentHash);
    }

    [Fact]
    public async Task RunAsync_DoesNotRecalculate_AnExistingNonNullHash()
    {
        var photos = new InMemoryPhotoRepository();
        var storage = new InMemoryMaintenancePhotoStorage();
        // Bytes in storage don't match the already-recorded hash — proves the command trusts an
        // existing hash rather than re-deriving it (GetMissingContentHashAsync excludes it).
        var photo = await SeedPhotoAsync(photos, storage, [9, 9, 9], existingHash: "already-set-hash");

        var exitCode = await CreateCommand(photos, storage).RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var stored = await photos.GetByIdAsync(photo.Id);
        Assert.Equal("already-set-hash", stored!.OriginalContentHash);
    }

    [Fact]
    public async Task RunAsync_HashesADeletedPhotoToo_SinceItsBlobIsNeverRemoved()
    {
        var photos = new InMemoryPhotoRepository();
        var storage = new InMemoryMaintenancePhotoStorage();
        var bytes = new byte[] { 5, 6, 7 };
        var photo = await SeedPhotoAsync(photos, storage, bytes, status: PhotoStatus.Deleted);

        var exitCode = await CreateCommand(photos, storage).RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var stored = await photos.GetByIdAsync(photo.Id);
        Assert.Equal(HashOf(bytes), stored!.OriginalContentHash);
    }

    [Fact]
    public async Task RunAsync_IsIdempotent_ASecondRunChangesNothing()
    {
        var photos = new InMemoryPhotoRepository();
        var storage = new InMemoryMaintenancePhotoStorage();
        var bytes = new byte[] { 1, 2, 3 };
        var photo = await SeedPhotoAsync(photos, storage, bytes);
        var command = CreateCommand(photos, storage);
        await command.RunAsync(dryRun: false);

        var exitCode = await command.RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var stored = await photos.GetByIdAsync(photo.Id);
        Assert.Equal(HashOf(bytes), stored!.OriginalContentHash);
    }

    [Fact]
    public async Task RunAsync_ContinuesPastAStorageReadFailure_AndReportsFailure()
    {
        var photos = new InMemoryPhotoRepository();
        var storage = new InMemoryMaintenancePhotoStorage();
        var goodBytes = new byte[] { 1, 2, 3 };
        var goodPhoto = await SeedPhotoAsync(photos, storage, goodBytes);
        var badPhoto = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, new BaulId(Guid.NewGuid()), "photos/missing.jpg", null, new UserId("user-1"), DateTime.UtcNow);
        await photos.CreateAsync(badPhoto); // never seeded in storage — OpenReadAsync throws (KeyNotFoundException)

        var exitCode = await CreateCommand(photos, storage).RunAsync(dryRun: false);

        Assert.Equal(1, exitCode);
        Assert.Equal(HashOf(goodBytes), (await photos.GetByIdAsync(goodPhoto.Id))!.OriginalContentHash);
    }

    [Fact]
    public async Task RunAsync_MergesTwoPreExistingUnflaggedDuplicates_WhenBackfillDiscoversTheSameHash()
    {
        var photos = new InMemoryPhotoRepository();
        var storage = new InMemoryMaintenancePhotoStorage();
        var baulId = new BaulId(Guid.NewGuid());
        var bytes = new byte[] { 1, 2, 3 };
        var hash = HashOf(bytes);
        // Photo A already has the hash (as if backfilled earlier); Photo B doesn't yet, but its
        // stored bytes hash to the exact same value — a pre-existing duplicate this run uncovers.
        var photoA = await SeedPhotoAsync(photos, storage, bytes, baulId, existingHash: hash);
        var photoB = await SeedPhotoAsync(photos, storage, bytes, baulId);

        var exitCode = await CreateCommand(photos, storage).RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var active = (await photos.GetActiveByBaulIdAsync(baulId)).ToList();
        Assert.Single(active);
        var reloadedA = await photos.GetByIdAsync(photoA.Id);
        var reloadedB = await photos.GetByIdAsync(photoB.Id);
        // Exactly one of the pair survives active; the other is flagged as a duplicate.
        Assert.NotEqual(reloadedA!.Status, reloadedB!.Status);
    }
}
