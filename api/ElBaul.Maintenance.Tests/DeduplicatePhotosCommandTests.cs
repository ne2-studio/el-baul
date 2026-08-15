using ElBaul.Application.Photos;
using ElBaul.Infra.Lite;
using ElBaul.Maintenance.Commands;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Maintenance.Tests;

public class DeduplicatePhotosCommandTests
{
    private readonly InMemoryPhotoRepository _photos = new();
    private readonly InMemoryChapterRepository _chapters = new();
    private readonly InMemoryBaulRepository _baules = new();
    private readonly InMemoryRecuerdoRepository _recuerdos = new();
    private readonly InMemoryPhotoPersonaTagRepository _tags = new();
    private readonly InMemorySharedLinkRepository _sharedLinks = new();

    private DeduplicatePhotosCommand CreateCommand() =>
        new(_photos, _recuerdos, _tags,
            new PhotoDuplicateMergeService(_photos, _chapters, _baules, _recuerdos, _tags, _sharedLinks,
                new PhotoLifecycleService(_photos, _chapters, _baules, new FixedClock(DateTime.UtcNow)),
                new FakeUnitOfWork(), new FixedClock(DateTime.UtcNow)),
            NullLogger<DeduplicatePhotosCommand>.Instance);

    private static PhotoDate Date(int year) => PhotoDate.Parse(year, null, null).Value;

    private async Task<Photo> SeedAsync(BaulId baulId, string storageKey, string hash, int? year = null, PhotoStatus status = PhotoStatus.Active)
    {
        var photo = Photo.Create(
            new PhotoId(Guid.NewGuid()), null, baulId, storageKey, year is { } y ? Date(y) : null,
            new UserId("user-1"), DateTime.UtcNow, originalContentHash: hash);
        if (status == PhotoStatus.Deleted) photo = photo.MarkDeleted("other reason", DateTime.UtcNow);
        await _photos.CreateAsync(photo);
        return photo;
    }

    [Fact]
    public async Task RunAsync_WithNoActiveDuplicates_MergesNothing()
    {
        var baulId = new BaulId(Guid.NewGuid());
        await SeedAsync(baulId, "a", "hash-a");
        await SeedAsync(baulId, "b", "hash-b");

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        Assert.Equal(2, (await _photos.GetActiveByBaulIdAsync(baulId)).Count());
    }

    [Fact]
    public async Task RunAsync_MergesADuplicatePair_KeepingOnlyTheSurvivorActive()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var survivor = await SeedAsync(baulId, "old", "same-hash", year: 1987);
        var duplicate = await SeedAsync(baulId, "new", "same-hash", year: 2020);

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var active = (await _photos.GetActiveByBaulIdAsync(baulId)).ToList();
        Assert.Single(active);
        Assert.Equal(survivor.Id, active[0].Id);
        var reloadedDuplicate = await _photos.GetByIdAsync(duplicate.Id);
        Assert.Equal(PhotoStatus.Deleted, reloadedDuplicate!.Status);
        Assert.Equal(PhotoDeletionReasons.FlaggedAsDuplicate, reloadedDuplicate.DeletionReason);
    }

    [Fact]
    public async Task RunAsync_MergesAGroupOfThreeOrMoreDuplicates_IntoOneSurvivor()
    {
        var baulId = new BaulId(Guid.NewGuid());
        await SeedAsync(baulId, "a", "same-hash", year: 2020);
        var survivor = await SeedAsync(baulId, "b", "same-hash", year: 1987);
        await SeedAsync(baulId, "c", "same-hash", year: 2015);
        await SeedAsync(baulId, "d", "same-hash", year: 2001);

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var active = (await _photos.GetActiveByBaulIdAsync(baulId)).ToList();
        Assert.Single(active);
        Assert.Equal(survivor.Id, active[0].Id);
    }

    [Fact]
    public async Task RunAsync_IgnoresNullHashes_TheyNeverCollide()
    {
        var baulId = new BaulId(Guid.NewGuid());
        await SeedAsync(baulId, "a", null!);
        await SeedAsync(baulId, "b", null!);

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        Assert.Equal(2, (await _photos.GetActiveByBaulIdAsync(baulId)).Count());
    }

    [Fact]
    public async Task RunAsync_IgnoresAlreadySoftDeletedDuplicates()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var active = await SeedAsync(baulId, "a", "same-hash");
        await SeedAsync(baulId, "b", "same-hash", status: PhotoStatus.Deleted);

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var activePhotos = (await _photos.GetActiveByBaulIdAsync(baulId)).ToList();
        Assert.Single(activePhotos);
        Assert.Equal(active.Id, activePhotos[0].Id);
    }

    [Fact]
    public async Task RunAsync_AllowsTheSameHash_InDifferentBaules()
    {
        var baulA = new BaulId(Guid.NewGuid());
        var baulB = new BaulId(Guid.NewGuid());
        await SeedAsync(baulA, "a", "shared-hash");
        await SeedAsync(baulB, "b", "shared-hash");

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        Assert.Single(await _photos.GetActiveByBaulIdAsync(baulA));
        Assert.Single(await _photos.GetActiveByBaulIdAsync(baulB));
    }

    [Fact]
    public async Task RunAsync_WithDryRun_MutatesNothing()
    {
        var baulId = new BaulId(Guid.NewGuid());
        await SeedAsync(baulId, "old", "same-hash", year: 1987);
        await SeedAsync(baulId, "new", "same-hash", year: 2020);

        var exitCode = await CreateCommand().RunAsync(dryRun: true);

        Assert.Equal(0, exitCode);
        Assert.Equal(2, (await _photos.GetActiveByBaulIdAsync(baulId)).Count());
    }

    [Fact]
    public async Task RunAsync_IsIdempotent_ASecondRunFindsAndMergesNothingMore()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var survivor = await SeedAsync(baulId, "old", "same-hash", year: 1987);
        await SeedAsync(baulId, "new", "same-hash", year: 2020);
        var command = CreateCommand();
        await command.RunAsync(dryRun: false);

        var exitCode = await command.RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var active = (await _photos.GetActiveByBaulIdAsync(baulId)).ToList();
        Assert.Single(active);
        Assert.Equal(survivor.Id, active[0].Id);
    }

    [Fact]
    public async Task RunAsync_TransfersMemoriesAndTaggedPeople_AsPartOfTheMerge()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var survivor = await SeedAsync(baulId, "old", "same-hash", year: 1987);
        var duplicate = await SeedAsync(baulId, "new", "same-hash", year: 2020);
        await _recuerdos.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), duplicate.Id, null, baulId, new UserId("u"), "Hola", DateTime.UtcNow));
        await _tags.SetTagsAsync(duplicate.Id, baulId, [new PersonaId(Guid.NewGuid())], DateTime.UtcNow);

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        Assert.Single(await _recuerdos.GetByPhotoIdAsync(survivor.Id));
        Assert.Single(await _tags.GetPersonaIdsByPhotoIdAsync(survivor.Id));
    }

    [Fact]
    public async Task RunAsync_ContinuesToOtherGroups_WhenOneGroupFailsDuringRelationshipMigration()
    {
        var brokenBaulId = new BaulId(Guid.NewGuid());
        var healthyBaulId = new BaulId(Guid.NewGuid());
        var brokenDuplicate = await SeedAsync(brokenBaulId, "a", "same-hash", year: 2020);
        await SeedAsync(brokenBaulId, "b", "same-hash", year: 1987);
        var healthySurvivor = await SeedAsync(healthyBaulId, "c", "same-hash", year: 1990);
        await SeedAsync(healthyBaulId, "d", "same-hash", year: 2021);

        // Fails only while migrating the broken group's memories — proves one group's failure
        // (mid-merge, before soft-delete) doesn't corrupt or block any other group's merge.
        var recuerdos = new FailingForOnePhotoRecuerdoRepository(brokenDuplicate.Id, _recuerdos);
        var mergeService = new PhotoDuplicateMergeService(_photos, _chapters, _baules, recuerdos, _tags, _sharedLinks,
            new PhotoLifecycleService(_photos, _chapters, _baules, new FixedClock(DateTime.UtcNow)),
            new FakeUnitOfWork(), new FixedClock(DateTime.UtcNow));
        var command = new DeduplicatePhotosCommand(_photos, _recuerdos, _tags, mergeService, NullLogger<DeduplicatePhotosCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        Assert.Equal(1, exitCode);
        // The broken group never reached its soft-delete step — both photos remain active.
        Assert.Equal(2, (await _photos.GetActiveByBaulIdAsync(brokenBaulId)).Count());
        // The healthy group still got merged.
        var healthyActive = (await _photos.GetActiveByBaulIdAsync(healthyBaulId)).ToList();
        Assert.Single(healthyActive);
        Assert.Equal(healthySurvivor.Id, healthyActive[0].Id);
    }

    private sealed class FailingForOnePhotoRecuerdoRepository(PhotoId failingPhotoId, IRecuerdoRepository inner) : IRecuerdoRepository
    {
        public Task<Recuerdo?> GetByIdAsync(RecuerdoId recuerdoId) => inner.GetByIdAsync(recuerdoId);
        public Task<IEnumerable<Recuerdo>> GetByPhotoIdAsync(PhotoId photoId) =>
            photoId == failingPhotoId ? throw new InvalidOperationException("simulated failure") : inner.GetByPhotoIdAsync(photoId);
        public Task<IEnumerable<Recuerdo>> GetByPhotoIdsAsync(IEnumerable<PhotoId> photoIds) => inner.GetByPhotoIdsAsync(photoIds);
        public Task<IEnumerable<Recuerdo>> GetByChapterIdAsync(ChapterId chapterId) => inner.GetByChapterIdAsync(chapterId);
        public Task<IEnumerable<Recuerdo>> GetByBaulIdAsync(BaulId baulId) => inner.GetByBaulIdAsync(baulId);
        public Task<IEnumerable<Recuerdo>> GetCreatedSinceByBaulIdAsync(BaulId baulId, DateTime since, UserId excludingUserId) =>
            inner.GetCreatedSinceByBaulIdAsync(baulId, since, excludingUserId);
        public Task<IEnumerable<Recuerdo>> GetAllAsync() => inner.GetAllAsync();
        public Task<IEnumerable<RecuerdoBaulIdCandidate>> GetCandidatesWithNoBaulIdAsync() => inner.GetCandidatesWithNoBaulIdAsync();
        public Task SetBaulIdAsync(RecuerdoId recuerdoId, BaulId baulId) => inner.SetBaulIdAsync(recuerdoId, baulId);
        public Task CreateAsync(Recuerdo recuerdo) => inner.CreateAsync(recuerdo);
        public Task UpdateAsync(Recuerdo recuerdo) => inner.UpdateAsync(recuerdo);
        public Task DeleteByBaulIdAsync(BaulId baulId) => inner.DeleteByBaulIdAsync(baulId);
    }
}
