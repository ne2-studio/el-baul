using System.Security.Cryptography;
using System.Text;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Chapters.Application;
using ElBaul.Core.Personas.Application;
using ElBaul.Core.Photos.Application;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.Application;
using ElBaul.Core.Recuerdos.Domain;
using ElBaul.Core.Sharing.Application;
using ElBaul.Infra.Lite;
using ElBaul.Maintenance.Commands;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Maintenance.Tests;

// Slice 4 of docs/.backlog issue #64 (PhotoAsset extraction): the one-off repair for historical
// PhotoAsset duplicates that predate Slice 2.5's global exact-duplicate upload dedup.
public class DeduplicatePhotoAssetsCommandTests
{
    private readonly InMemoryPhotoRepository _photos = new();
    private readonly InMemoryChapterRepository _chapters = new();
    private readonly InMemoryPersonaRepository _personas = new();
    private readonly InMemoryBaulRepository _baules;
    private readonly InMemoryRecuerdoRepository _recuerdos = new();
    private readonly InMemoryPhotoPersonaTagRepository _tags = new();
    private readonly InMemorySharedLinkRepository _sharedLinks = new();
    private readonly FakePhotoStorage _storage = new();
    private readonly DateTime _now = new(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
    private static readonly UserId Pedro = new("pedro");
    private static readonly UserId Jaime = new("jaime");

    public DeduplicatePhotoAssetsCommandTests()
    {
        _baules = new InMemoryBaulRepository(_personas);
    }

    private IEnumerable<IPhotoMergeListener> CreateMergeListeners() =>
        [
            new SharedLinkPhotoMergeListener(_sharedLinks),
            new BaulCoverPhotoMergeListener(_baules),
            new ChapterCoverPhotoMergeListener(_chapters),
            new PersonaAvatarPhotoMergeListener(_personas),
            new PhotoPersonaTagMergeListener(_tags),
            new RecuerdoPhotoMergeListener(_recuerdos),
        ];

    private PhotoDuplicateMergeService CreatePhotoDuplicateMergeService() =>
        new(_photos, CreateMergeListeners(),
            new PhotoLifecycleService(_photos, new ChapterPhotoCountListener(_chapters), new BaulPhotoCoverListener(_baules), new FixedClock(_now)),
            new FakeUnitOfWork(), new FixedClock(_now));

    private DeduplicatePhotoAssetsCommand CreateCommand(IPhotoRepository? photos = null, MaintenanceCommandArguments? arguments = null) =>
        new(photos ?? _photos, _storage,
            new PhotoAssetMergeService(photos ?? _photos, CreatePhotoDuplicateMergeService(), new FakeUnitOfWork()),
            arguments ?? new MaintenanceCommandArguments([]), NullLogger<DeduplicatePhotoAssetsCommand>.Instance);

    private static byte[] Bytes(string content) => Encoding.UTF8.GetBytes(content);
    private static string Sha256Hex(byte[] bytes) => Convert.ToHexStringLower(SHA256.HashData(bytes));

    // Mirrors the state the single "winner" of a historical hash collision keeps today (see
    // migration 20260913154323_AddUserPhotoAssetsAndGlobalContentHash) — a real, persisted,
    // trustworthy hash.
    private async Task<PhotoAsset> SeedTrustedAssetAsync(string storageKey, byte[] bytes, DateTime? createdAt = null, UserId? uploadedBy = null)
    {
        var asset = PhotoAsset.Create(
            new PhotoAssetId(Guid.NewGuid()), storageKey, new ImageDimensions(10, 10), createdAt ?? _now,
            uploadedBy ?? Pedro, originalContentHash: Sha256Hex(bytes));
        await _photos.TryCreateAssetAsync(asset);
        _storage.Seed(storageKey, bytes);
        return asset;
    }

    // Mirrors the state every *losing* row of a historical collision was left in: hash nulled
    // out, bytes still physically present under its own StorageKey — the command must rehash
    // from storage to find these.
    private async Task<PhotoAsset> SeedLegacyNullHashAssetAsync(string storageKey, byte[] bytes, DateTime? createdAt = null, UserId? uploadedBy = null)
    {
        var asset = PhotoAsset.Create(
            new PhotoAssetId(Guid.NewGuid()), storageKey, new ImageDimensions(10, 10), createdAt ?? _now, uploadedBy ?? Pedro);
        await _photos.TryCreateAssetAsync(asset);
        _storage.Seed(storageKey, bytes);
        return asset;
    }

    private async Task<Photo> SeedPhotoAsync(
        BaulId baulId, PhotoAsset asset, UserId? uploadedBy = null, PhotoStatus status = PhotoStatus.Active, PhotoDate? takenAt = null)
    {
        var photo = Photo.CreateFromExistingAsset(new PhotoId(Guid.NewGuid()), baulId, asset, takenAt, uploadedBy ?? Pedro, _now);
        if (status == PhotoStatus.Deleted) photo = photo.MarkDeleted("other reason", _now);
        await _photos.TryAddExistingAssetAsync(photo);
        return photo;
    }

    [Fact]
    public async Task RunAsync_ConsolidatesTwoDuplicateAssets_IntoOneCanonicalPhotoAsset()
    {
        var bytes = Bytes("same bytes");
        var baulA = new BaulId(Guid.NewGuid());
        var baulB = new BaulId(Guid.NewGuid());
        var canonical = await SeedTrustedAssetAsync("a.jpg", bytes, createdAt: _now.AddDays(-10));
        var legacy = await SeedLegacyNullHashAssetAsync("b.jpg", bytes, createdAt: _now);
        var photoInA = await SeedPhotoAsync(baulA, canonical);
        var photoInB = await SeedPhotoAsync(baulB, legacy);

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        Assert.NotNull(await _photos.GetAssetByIdAsync(canonical.Id));
        Assert.Null(await _photos.GetAssetByIdAsync(legacy.Id));
        Assert.Equal(canonical.Id, (await _photos.GetByIdAsync(photoInA.Id))!.PhotoAssetId);
        Assert.Equal(canonical.Id, (await _photos.GetByIdAsync(photoInB.Id))!.PhotoAssetId);
    }

    [Fact]
    public async Task RunAsync_CollapsesTheSameUsersTwoRelations_IntoOneKeepingTheEarliestAddedAt()
    {
        var bytes = Bytes("pedro's duplicate bytes");
        var earliest = _now.AddDays(-30);
        var latest = _now.AddDays(-5);
        var canonical = await SeedTrustedAssetAsync("a.jpg", bytes, createdAt: _now.AddDays(-10));
        var legacy = await SeedLegacyNullHashAssetAsync("b.jpg", bytes, createdAt: _now);
        await _photos.TryCreateUserPhotoAssetAsync(Pedro, canonical.Id, latest);
        await _photos.TryCreateUserPhotoAssetAsync(Pedro, legacy.Id, earliest);

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var pedrosAssets = await _photos.GetByContributorAsync(Pedro);
        Assert.Single(pedrosAssets);
        Assert.Equal(canonical.Id, pedrosAssets[0].Id);
        Assert.False(await _photos.HasUserPhotoAssetAsync(Pedro, legacy.Id));
    }

    [Fact]
    public async Task RunAsync_PreservesBothUsersRelations_WhenDifferentUsersContributedEachDuplicate()
    {
        var bytes = Bytes("shared by two people");
        var canonical = await SeedTrustedAssetAsync("a.jpg", bytes, createdAt: _now.AddDays(-10));
        var legacy = await SeedLegacyNullHashAssetAsync("b.jpg", bytes, createdAt: _now);
        await _photos.TryCreateUserPhotoAssetAsync(Pedro, canonical.Id, _now);
        await _photos.TryCreateUserPhotoAssetAsync(Jaime, legacy.Id, _now);

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        Assert.True(await _photos.HasUserPhotoAssetAsync(Pedro, canonical.Id));
        Assert.True(await _photos.HasUserPhotoAssetAsync(Jaime, canonical.Id));
    }

    [Fact]
    public async Task RunAsync_MakesTheCanonicalAssetAppearInBothBaules_WhenEachDuplicateWasInADifferentBaul()
    {
        var bytes = Bytes("cross-baul duplicate");
        var baulPardal = new BaulId(Guid.NewGuid());
        var baulJimena = new BaulId(Guid.NewGuid());
        var canonical = await SeedTrustedAssetAsync("a.jpg", bytes, createdAt: _now.AddDays(-10));
        var legacy = await SeedLegacyNullHashAssetAsync("b.jpg", bytes, createdAt: _now);
        await SeedPhotoAsync(baulPardal, canonical);
        await SeedPhotoAsync(baulJimena, legacy);

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        Assert.Single(await _photos.GetActiveByBaulIdAsync(baulPardal));
        Assert.Single(await _photos.GetActiveByBaulIdAsync(baulJimena));
        Assert.All(
            (await _photos.GetActiveByBaulIdAsync(baulPardal)).Concat(await _photos.GetActiveByBaulIdAsync(baulJimena)),
            p => Assert.Equal(canonical.Id, p.PhotoAssetId));
    }

    [Fact]
    public async Task RunAsync_KeepsOnlyOnePhotoProjection_WhenBothDuplicatesLandInTheSameBaul()
    {
        var bytes = Bytes("same baul, no conflicting data");
        var baulId = new BaulId(Guid.NewGuid());
        var canonical = await SeedTrustedAssetAsync("a.jpg", bytes, createdAt: _now.AddDays(-10));
        var legacy = await SeedLegacyNullHashAssetAsync("b.jpg", bytes, createdAt: _now);
        await SeedPhotoAsync(baulId, canonical);
        await SeedPhotoAsync(baulId, legacy);

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        var active = (await _photos.GetActiveByBaulIdAsync(baulId)).ToList();
        Assert.Single(active);
        Assert.Equal(canonical.Id, active[0].PhotoAssetId);
    }

    [Fact]
    public async Task RunAsync_TransfersRecuerdosAndTags_WhenCollapsingASameBaulConflict()
    {
        // The codebase's one existing answer to "two Photo rows about the exact same content
        // collide in one baúl" (PhotoDuplicateMergeService, reused here — see
        // PhotoAssetMergeService's doc comment) is to reassign every dependent onto the survivor,
        // never to discard it: this is how "conflicting" contextual data is safely preserved.
        var bytes = Bytes("same baul, with contextual data on the duplicate");
        var baulId = new BaulId(Guid.NewGuid());
        var canonical = await SeedTrustedAssetAsync("a.jpg", bytes, createdAt: _now.AddDays(-10));
        var legacy = await SeedLegacyNullHashAssetAsync("b.jpg", bytes, createdAt: _now);
        // Gives PhotoDuplicateMergeService.SelectSurvivor a deterministic, dated survivor to pick
        // (a non-null TakenAt always sorts before a null one) — which underlying Photo row
        // survives the same-baúl merge is PhotoDuplicateMergeService's own decision, orthogonal
        // to which PhotoAsset this command picked as canonical.
        var survivorPhoto = await SeedPhotoAsync(baulId, canonical, takenAt: PhotoDate.Parse(2020, 1, 1).Value);
        var duplicatePhoto = await SeedPhotoAsync(baulId, legacy);
        await _recuerdos.CreateAsync(new Recuerdo(
            new RecuerdoId(Guid.NewGuid()), duplicatePhoto.Id, null, baulId, Pedro, "Qué lindo recuerdo", _now));
        await _tags.SetTagsAsync(duplicatePhoto.Id, baulId, [new PersonaId(Guid.NewGuid())], _now);

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        Assert.Single(await _recuerdos.GetByPhotoIdAsync(survivorPhoto.Id));
        Assert.Single(await _tags.GetPersonaIdsByPhotoIdAsync(survivorPhoto.Id));
    }

    [Fact]
    public async Task RunAsync_DryRun_MakesNoDatabaseOrStorageChanges()
    {
        var bytes = Bytes("dry run bytes");
        var canonical = await SeedTrustedAssetAsync("a.jpg", bytes, createdAt: _now.AddDays(-10));
        var legacy = await SeedLegacyNullHashAssetAsync("b.jpg", bytes, createdAt: _now);

        var exitCode = await CreateCommand().RunAsync(dryRun: true);

        Assert.Equal(0, exitCode);
        Assert.NotNull(await _photos.GetAssetByIdAsync(canonical.Id));
        Assert.NotNull(await _photos.GetAssetByIdAsync(legacy.Id));
        Assert.Empty(_storage.DeletedKeys);
    }

    [Fact]
    public async Task RunAsync_IsIdempotent_ASecondRunFindsAndMergesNothingMore()
    {
        var bytes = Bytes("idempotency bytes");
        var canonical = await SeedTrustedAssetAsync("a.jpg", bytes, createdAt: _now.AddDays(-10));
        var legacy = await SeedLegacyNullHashAssetAsync("b.jpg", bytes, createdAt: _now);
        var command = CreateCommand();
        await command.RunAsync(dryRun: false);

        var exitCode = await command.RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        Assert.NotNull(await _photos.GetAssetByIdAsync(canonical.Id));
        Assert.Null(await _photos.GetAssetByIdAsync(legacy.Id));
        Assert.Equal(1, _storage.DeletedKeys.Count(k => k == "b.jpg"));
    }

    [Fact]
    public async Task RunAsync_DeletesTheDuplicatesStorageObject_WhenItDiffersFromTheCanonicalsKey()
    {
        var bytes = Bytes("distinct storage keys");
        await SeedTrustedAssetAsync("canonical-key.jpg", bytes, createdAt: _now.AddDays(-10));
        await SeedLegacyNullHashAssetAsync("duplicate-key.jpg", bytes, createdAt: _now);

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        Assert.Equal(["duplicate-key.jpg"], _storage.DeletedKeys);
    }

    [Fact]
    public async Task RunAsync_NeverDeletesStorage_WhenBothDuplicatesShareTheExactSameStorageKey()
    {
        var bytes = Bytes("shared storage key");
        await SeedTrustedAssetAsync("shared.jpg", bytes, createdAt: _now.AddDays(-10));
        await SeedLegacyNullHashAssetAsync("shared.jpg", bytes, createdAt: _now);

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        Assert.Empty(_storage.DeletedKeys);
    }

    [Fact]
    public async Task RunAsync_NeverMergesAssetsWithDifferentContent()
    {
        var assetA = await SeedTrustedAssetAsync("a.jpg", Bytes("content A"));
        var assetB = await SeedTrustedAssetAsync("b.jpg", Bytes("content B"));

        var exitCode = await CreateCommand().RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        Assert.NotNull(await _photos.GetAssetByIdAsync(assetA.Id));
        Assert.NotNull(await _photos.GetAssetByIdAsync(assetB.Id));
    }

    [Fact]
    public async Task RunAsync_NeverMergesTwoAssetsThatBothHaveNoRecoverableHash()
    {
        // Neither a persisted hash nor bytes it can rehash from storage — must be reported, not
        // guessed at (docs/.backlog issue #64 §1).
        var assetA = await SeedLegacyNullHashAssetAsync("missing-a.jpg", Bytes("irrelevant"));
        var assetB = await SeedLegacyNullHashAssetAsync("missing-b.jpg", Bytes("irrelevant"));
        // A separate, empty storage: neither key is readable, simulating both objects being
        // gone/unreadable — the command must never guess a hash for either.
        var brokenStorage = new FakePhotoStorage();
        var command = new DeduplicatePhotoAssetsCommand(
            _photos, brokenStorage, new PhotoAssetMergeService(_photos, CreatePhotoDuplicateMergeService(), new FakeUnitOfWork()),
            new MaintenanceCommandArguments([]), NullLogger<DeduplicatePhotoAssetsCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        Assert.Equal(0, exitCode); // hashing failures are reported, not treated as a merge failure
        Assert.NotNull(await _photos.GetAssetByIdAsync(assetA.Id));
        Assert.NotNull(await _photos.GetAssetByIdAsync(assetB.Id));
    }

    [Fact]
    public async Task RunAsync_ContinuesToOtherGroups_WhenOneGroupFailsBeforeWritingAnything()
    {
        var brokenBytes = Bytes("broken group");
        var healthyBytes = Bytes("healthy group");
        var brokenCanonical = await SeedTrustedAssetAsync("broken-a.jpg", brokenBytes, createdAt: _now.AddDays(-10));
        var brokenLegacy = await SeedLegacyNullHashAssetAsync("broken-b.jpg", brokenBytes, createdAt: _now);
        var healthyCanonical = await SeedTrustedAssetAsync("healthy-a.jpg", healthyBytes, createdAt: _now.AddDays(-10));
        var healthyLegacy = await SeedLegacyNullHashAssetAsync("healthy-b.jpg", healthyBytes, createdAt: _now);

        // Fails on the very first read inside PhotoAssetMergeService's transaction, before any
        // write for that group happens — proves one group's failure doesn't corrupt or block
        // any other group (real rollback-on-partial-failure is covered against Postgres in
        // ElBaul.Infra.PersistenceTests, not here — see FakeUnitOfWork's own doc comment).
        var repository = new FailingForOneAssetPhotoRepository(brokenCanonical.Id, _photos);
        var command = new DeduplicatePhotoAssetsCommand(
            repository, _storage, new PhotoAssetMergeService(repository, CreatePhotoDuplicateMergeService(), new FakeUnitOfWork()),
            new MaintenanceCommandArguments([]), NullLogger<DeduplicatePhotoAssetsCommand>.Instance);

        var exitCode = await command.RunAsync(dryRun: false);

        Assert.Equal(1, exitCode);
        Assert.NotNull(await _photos.GetAssetByIdAsync(brokenCanonical.Id));
        Assert.NotNull(await _photos.GetAssetByIdAsync(brokenLegacy.Id));
        Assert.NotNull(await _photos.GetAssetByIdAsync(healthyCanonical.Id));
        Assert.Null(await _photos.GetAssetByIdAsync(healthyLegacy.Id));
    }

    [Fact]
    public async Task RunAsync_HashFilter_OnlyProcessesTheMatchingGroup()
    {
        var bytesA = Bytes("group a");
        var bytesB = Bytes("group b");
        var canonicalA = await SeedTrustedAssetAsync("a1.jpg", bytesA, createdAt: _now.AddDays(-10));
        var legacyA = await SeedLegacyNullHashAssetAsync("a2.jpg", bytesA, createdAt: _now);
        var canonicalB = await SeedTrustedAssetAsync("b1.jpg", bytesB, createdAt: _now.AddDays(-10));
        var legacyB = await SeedLegacyNullHashAssetAsync("b2.jpg", bytesB, createdAt: _now);
        var arguments = new MaintenanceCommandArguments(["--hash", Sha256Hex(bytesA)]);

        var exitCode = await CreateCommand(arguments: arguments).RunAsync(dryRun: false);

        Assert.Equal(0, exitCode);
        Assert.Null(await _photos.GetAssetByIdAsync(legacyA.Id));
        Assert.NotNull(await _photos.GetAssetByIdAsync(canonicalA.Id));
        Assert.NotNull(await _photos.GetAssetByIdAsync(canonicalB.Id));
        Assert.NotNull(await _photos.GetAssetByIdAsync(legacyB.Id));
    }

    // Fails GetAllByAssetIdsAsync — the very first call PhotoAssetMergeService.MergeGroupAsync
    // makes — whenever the target asset id is among the ids requested, and only then; every
    // other call is forwarded untouched.
    private sealed class FailingForOneAssetPhotoRepository(PhotoAssetId failingAssetId, IPhotoRepository inner) : IPhotoRepository
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
        public Task<IEnumerable<Photo>> GetPageAsync(BaulId baulId, ChapterId? chapterId, int skip, int take) =>
            inner.GetPageAsync(baulId, chapterId, skip, take);
        public Task<IEnumerable<Photo>> GetAllByBaulIdAsync(BaulId baulId) => inner.GetAllByBaulIdAsync(baulId);
        public Task<IEnumerable<Photo>> GetActiveWithContentHashAsync() => inner.GetActiveWithContentHashAsync();
        public Task<Photo?> GetActiveByAssetIdAsync(BaulId baulId, PhotoAssetId assetId) => inner.GetActiveByAssetIdAsync(baulId, assetId);
        public Task CreateAsync(Photo photo) => inner.CreateAsync(photo);
        public Task<bool> TryAddExistingAssetAsync(Photo photo) => inner.TryAddExistingAssetAsync(photo);
        public Task UpdateAsync(Photo photo) => inner.UpdateAsync(photo);
        public Task DeleteAsync(PhotoId id) => inner.DeleteAsync(id);
        public Task DeleteByBaulIdAsync(BaulId baulId) => inner.DeleteByBaulIdAsync(baulId);
        public Task<IReadOnlyList<PhotoAsset>> GetByContributorAsync(UserId userId) => inner.GetByContributorAsync(userId);
        public Task<PhotoAsset?> GetAssetByIdAsync(PhotoAssetId id) => inner.GetAssetByIdAsync(id);
        public Task<PhotoAsset?> GetAssetByContentHashAsync(string originalContentHash) => inner.GetAssetByContentHashAsync(originalContentHash);
        public Task<bool> TryCreateAssetAsync(PhotoAsset asset) => inner.TryCreateAssetAsync(asset);
        public Task<bool> HasUserPhotoAssetAsync(UserId userId, PhotoAssetId assetId) => inner.HasUserPhotoAssetAsync(userId, assetId);
        public Task<bool> TryCreateUserPhotoAssetAsync(UserId userId, PhotoAssetId assetId, DateTime addedAt) =>
            inner.TryCreateUserPhotoAssetAsync(userId, assetId, addedAt);
        public Task<IReadOnlyList<Photo>> GetActiveByAssetIdsAsync(IEnumerable<PhotoAssetId> assetIds) => inner.GetActiveByAssetIdsAsync(assetIds);
        public Task<IReadOnlyList<PhotoAsset>> GetOrphanedAssetsAsync(DateTime olderThan) => inner.GetOrphanedAssetsAsync(olderThan);
        public Task DeleteAssetAsync(PhotoAssetId id) => inner.DeleteAssetAsync(id);
        public Task<IReadOnlyList<PhotoAsset>> GetAllAssetsAsync() => inner.GetAllAssetsAsync();

        public Task<IReadOnlyList<Photo>> GetAllByAssetIdsAsync(IEnumerable<PhotoAssetId> assetIds)
        {
            var ids = assetIds.ToList();
            if (ids.Contains(failingAssetId)) throw new InvalidOperationException("simulated failure");
            return inner.GetAllByAssetIdsAsync(ids);
        }

        public Task<IReadOnlyList<UserPhotoAsset>> GetUserPhotoAssetsByAssetIdsAsync(IEnumerable<PhotoAssetId> assetIds) =>
            inner.GetUserPhotoAssetsByAssetIdsAsync(assetIds);
        public Task RepointPhotoAssetIdAsync(IEnumerable<PhotoId> photoIds, PhotoAssetId newAssetId, string? newOriginalContentHash) =>
            inner.RepointPhotoAssetIdAsync(photoIds, newAssetId, newOriginalContentHash);
        public Task RedirectUserPhotoAssetAsync(UserId userId, PhotoAssetId newAssetId, DateTime addedAt) =>
            inner.RedirectUserPhotoAssetAsync(userId, newAssetId, addedAt);
        public Task DeleteUserPhotoAssetAsync(UserId userId, PhotoAssetId assetId) => inner.DeleteUserPhotoAssetAsync(userId, assetId);
        public Task SetAssetContentHashAsync(PhotoAssetId id, string originalContentHash) => inner.SetAssetContentHashAsync(id, originalContentHash);
    }
}
