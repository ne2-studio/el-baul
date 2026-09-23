using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Recuerdos.Domain;
using System.Security.Cryptography;
using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Personas.Application;
using ElBaul.Core.Photos.Application;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using ElBaul.Tests.Fixtures;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class PhotoManagerTests
{
    private const string CustodioId = BaulFixture.DefaultCustodioId;

    private readonly BaulFixture _fixture = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly FakePhotoDateExtractor _photoDateExtractor = new();

    private PhotoLifecycleService CreatePhotoLifecycleService(IPhotoRepository? photoRepository = null) =>
        new(photoRepository ?? _fixture.Photos, _fixture.ChapterPhotoCountListener, _fixture.BaulPhotoCoverListener, _fixture.Clock);

    private PhotoDtoProjector CreatePhotoDtoProjector(IPhotoStorage? photoStorage = null) =>
        new(photoStorage ?? _photoStorage, _fixture.Recuerdos, _fixture.Clock);

    private PhotoFileService CreatePhotoFileService(IPhotoStorage? photoStorage = null) =>
        new(NullLogger<PhotoFileService>.Instance, photoStorage ?? _photoStorage, new StaticIdGenerator(Guid.NewGuid()), _photoDateExtractor,
            new FakePhotoImageNormalizer(), new FakeImageProcessor(), new ImagePolicy());

    private PhotoUploadWorkflow CreatePhotoUploadWorkflow(IPhotoRepository? photoRepository = null, IPhotoStorage? photoStorage = null, Guid? nextId = null) =>
        new(NullLogger<PhotoUploadWorkflow>.Instance, photoRepository ?? _fixture.Photos, CreatePhotoFileService(photoStorage),
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), _fixture.Clock, new FakeUnitOfWork());

    private IPhotoListReadModel CreatePhotoListReadModel() =>
        new InMemoryPhotoListReadModel(_fixture.Photos, _fixture.Recuerdos, _fixture.PhotoPersonaTags);

    private MyPhotosReadManager CreateMyPhotosReadManager(string currentUserId, IPhotoStorage? photoStorage = null) =>
        new(_fixture.Photos, new StaticCurrentUserProvider(currentUserId),
            new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            photoStorage ?? _photoStorage);

    private PhotoManager CreateManager(
        string currentUserId, Guid? nextId = null, ILogger<PhotoManager>? logger = null, Guid? nextAddToBaulId = null) =>
        new(logger ?? NullLogger<PhotoManager>.Instance, _fixture.Photos, _fixture.Chapters,
            new StaticCurrentUserProvider(currentUserId), new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            CreatePhotoLifecycleService(), CreatePhotoDtoProjector(), CreatePhotoUploadWorkflow(nextId: nextId),
            CreateMyPhotosReadManager(currentUserId),
            new StaticIdGenerator(nextAddToBaulId ?? Guid.NewGuid()), _fixture.Clock,
            new FakeUnitOfWork());

    private PhotoReadManager CreateReadManager(string currentUserId, ILogger<PhotoReadManager>? logger = null) =>
        new(logger ?? NullLogger<PhotoReadManager>.Instance, _fixture.Photos, CreatePhotoListReadModel(), _fixture.Chapters, _fixture.Personas,
            new StaticCurrentUserProvider(currentUserId), new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            _fixture.PhotoPersonaTags, CreatePhotoDtoProjector(), CreatePhotoFileService(),
            new InMemoryPhotoUploadBatchReadModel(_fixture.Photos, _fixture.Recuerdos, _fixture.Chapters));

    // Persona-tagging now lives on PhotoPersonaTagManager — GetByPersonaIdAsync stays here
    // (it's a photo listing method), but tests need to tag photos first to exercise it.
    private PhotoPersonaTagManager CreateTagManager(string currentUserId) =>
        new(NullLogger<PhotoPersonaTagManager>.Instance, _fixture.Photos, _fixture.Personas, _photoStorage, _fixture.Clock,
            new StaticCurrentUserProvider(currentUserId), new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            _fixture.PhotoPersonaTags, new FakeUnitOfWork());

    [Fact]
    public async Task UploadAsync_ShouldSaveFile_AndIncrementChapterPhotoCount()
    {
        var (_, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(chapterId, content, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Single(_photoStorage.SavedKeys);

        var chapter = await _fixture.Chapters.GetByIdAsync(chapterId);
        Assert.Equal(1, chapter!.PhotoCount);
    }

    // UploadBatchId isn't part of PhotoDto (it's an internal grouping key, only surfaced
    // aggregated via IBaulFeedManager), so this reads the persisted Photo back through the
    // repository rather than the returned DTO.
    [Fact]
    public async Task UploadAsync_ShouldPersistUploadBatchId_WhenProvided()
    {
        var (_, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);
        var uploadBatchId = Guid.NewGuid();

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(
            chapterId, content, new ClientUploadId(Guid.NewGuid()), uploadBatchId);

        Assert.True(result.IsSuccess);
        var stored = await _fixture.Photos.GetByIdAsync(new PhotoId(Guid.Parse(result.Value.Id)));
        Assert.Equal(uploadBatchId, stored!.UploadBatchId);
    }

    [Fact]
    public async Task UploadAsync_ShouldRecordFileSizeInBytes()
    {
        var (_, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3, 4, 5]);
        var result = await manager.UploadAsync(chapterId, content, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        var stored = await _fixture.Photos.GetByIdAsync(new PhotoId(Guid.Parse(result.Value.Id)));
        Assert.Equal(5, stored!.SizeBytes);
    }

    [Fact]
    public async Task UploadAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var (_, chapterId) = await _fixture.CreateBaulWithChapterAsync();

        var manager = CreateManager("stranger");
        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(chapterId, content, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task UploadAsync_ShouldPropagateException_WhenStorageSaveFails()
    {
        var (_, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var failingStorage = Substitute.For<IPhotoStorage>();
        failingStorage.SaveAsync(Arg.Any<string>(), Arg.Any<Stream>(), Arg.Any<string>())
            .Returns<Task>(_ => throw new InvalidOperationException("storage unavailable"));

        var manager = new PhotoManager(
            NullLogger<PhotoManager>.Instance, _fixture.Photos, _fixture.Chapters,
            new StaticCurrentUserProvider(CustodioId), new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            CreatePhotoLifecycleService(), CreatePhotoDtoProjector(failingStorage), CreatePhotoUploadWorkflow(photoStorage: failingStorage),
            CreateMyPhotosReadManager(CustodioId),
            new StaticIdGenerator(Guid.NewGuid()), _fixture.Clock,
            new FakeUnitOfWork());

        using var content = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => manager.UploadAsync(chapterId, content, new ClientUploadId(Guid.NewGuid())));

        Assert.Empty(await _fixture.Photos.GetByChapterIdAsync(chapterId));
    }

    [Fact]
    public async Task UploadAsync_ShouldDeleteOrphanedStorageObject_WhenPersistingMetadataFails()
    {
        var (_, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var failingRepository = Substitute.For<IPhotoRepository>();
        failingRepository.TryCreateAssetAsync(Arg.Any<PhotoAsset>())
            .Returns<Task<bool>>(_ => throw new InvalidOperationException("database unavailable"));

        var manager = new PhotoManager(
            NullLogger<PhotoManager>.Instance, failingRepository, _fixture.Chapters,
            new StaticCurrentUserProvider(CustodioId), new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            CreatePhotoLifecycleService(failingRepository), CreatePhotoDtoProjector(), CreatePhotoUploadWorkflow(failingRepository),
            CreateMyPhotosReadManager(CustodioId),
            new StaticIdGenerator(Guid.NewGuid()), _fixture.Clock,
            new FakeUnitOfWork());

        using var content = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => manager.UploadAsync(chapterId, content, new ClientUploadId(Guid.NewGuid())));

        // The file was saved to storage before the DB write failed, so the manager
        // must compensate by deleting it to avoid leaving an orphaned blob.
        Assert.Single(_photoStorage.SavedKeys);
        Assert.Equal(_photoStorage.SavedKeys, _photoStorage.DeletedKeys);
    }

    [Fact]
    public async Task UploadToBaulAsync_ShouldDeleteOrphanedStorageObject_WhenPersistingMetadataFails()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();
        var failingRepository = Substitute.For<IPhotoRepository>();
        failingRepository.TryCreateAssetAsync(Arg.Any<PhotoAsset>())
            .Returns<Task<bool>>(_ => throw new InvalidOperationException("database unavailable"));

        var manager = new PhotoManager(
            NullLogger<PhotoManager>.Instance, failingRepository, _fixture.Chapters,
            new StaticCurrentUserProvider(CustodioId), new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            CreatePhotoLifecycleService(failingRepository), CreatePhotoDtoProjector(), CreatePhotoUploadWorkflow(failingRepository),
            CreateMyPhotosReadManager(CustodioId),
            new StaticIdGenerator(Guid.NewGuid()), _fixture.Clock,
            new FakeUnitOfWork());

        using var content = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => manager.UploadToBaulAsync(baulId, content, new ClientUploadId(Guid.NewGuid())));

        Assert.Single(_photoStorage.SavedKeys);
        Assert.Equal(_photoStorage.SavedKeys, _photoStorage.DeletedKeys);
    }

    [Fact]
    public async Task UploadAsync_ShouldReturnExistingPhoto_WhenClientUploadIdAlreadyExists()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var clientUploadId = Guid.NewGuid();
        var existingPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "already-uploaded-key", clientUploadId: clientUploadId);

        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(chapterId, content, new ClientUploadId(clientUploadId));

        Assert.True(result.IsSuccess);
        Assert.Equal(existingPhotoId.ToString(), result.Value.Id);
        // No new upload should have happened: retrying with a known clientUploadId is a no-op.
        Assert.Empty(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task UploadToBaulAsync_ShouldReturnExistingPhoto_WhenClientUploadIdAlreadyExists()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();
        var clientUploadId = Guid.NewGuid();
        var existingPhotoId = await _fixture.AddPhotoAsync(baulId, storageKey: "already-uploaded-key", clientUploadId: clientUploadId);

        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadToBaulAsync(baulId, content, new ClientUploadId(clientUploadId));

        Assert.True(result.IsSuccess);
        Assert.Equal(existingPhotoId.ToString(), result.Value.Id);
        Assert.Empty(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task UploadAsync_ReportsAlreadyExisted_WhenBytesExactlyMatchAnActivePhotoInTheSameBaul()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var bytes = new byte[] { 10, 20, 30 };
        var hash = Convert.ToHexStringLower(SHA256.HashData(bytes));
        var existingPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "already-in-baul-key", originalContentHash: hash);

        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream(bytes);
        var result = await manager.UploadAsync(chapterId, content, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.True(result.Value.AlreadyExisted);
        Assert.Equal(existingPhotoId.ToString(), result.Value.Id);
        // The chapter's active photo count is untouched — the newly-received bytes never became
        // an active photo (see PhotoUploadWorkflow.RecordDuplicateAsync).
        var chapter = await _fixture.Chapters.GetByIdAsync(chapterId);
        Assert.Equal(0, chapter!.PhotoCount);
    }

    [Fact]
    public async Task UploadAsync_ReusesTheExistingCanonicalAsset_AndNeverWritesToStorage_WhenBytesExactlyMatchAnActivePhotoInTheSameBaul()
    {
        // Slice 2.5 (docs/.backlog issue #62): exact-duplicate detection is now global and runs
        // off the content hash before any normalization/storage write — a re-upload of bytes
        // that already back an active Photo in this exact baúl never touches storage at all, and
        // never creates a second (even soft-deleted) Photo row for it.
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var bytes = new byte[] { 11, 22, 33 };
        var hash = Convert.ToHexStringLower(SHA256.HashData(bytes));
        await _fixture.AddPhotoAsync(baulId, chapterId, "already-in-baul-key", originalContentHash: hash);

        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream(bytes);
        await manager.UploadAsync(chapterId, content, new ClientUploadId(Guid.NewGuid()));

        Assert.Empty(_photoStorage.SavedKeys);
        var allPhotosInChapter = await _fixture.Photos.GetAllByChapterIdAsync(chapterId);
        Assert.Single(allPhotosInChapter);
    }

    [Fact]
    public async Task UploadToBaulAsync_AllowsTheSameBytes_InADifferentBaul()
    {
        var bytes = new byte[] { 40, 50, 60 };
        var hash = Convert.ToHexStringLower(SHA256.HashData(bytes));
        var (baulA, _) = await _fixture.CreateBaulWithChapterAsync(custodioId: CustodioId, baulName: "Baúl A");
        await _fixture.AddPhotoAsync(baulA, storageKey: "in-baul-a", originalContentHash: hash);
        var baulB = await _fixture.CreateBaulAsync("Baúl B", CustodioId);

        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream(bytes);
        var result = await manager.UploadToBaulAsync(baulB, content, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.False(result.Value.AlreadyExisted);
    }

    [Fact]
    public async Task UploadToBaulAsync_TreatsANullHash_AsNeverColliding()
    {
        var baulId = await _fixture.CreateBaulAsync();
        // A legacy photo with no hash yet — never a duplicate match for anything.
        await _fixture.AddPhotoAsync(baulId, storageKey: "legacy-key", originalContentHash: null);

        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadToBaulAsync(baulId, content, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.False(result.Value.AlreadyExisted);
    }

    [Fact]
    public async Task UploadToBaulAsync_IsNotBlockedByASoftDeletedDuplicate_AndBecomesTheNewActiveSurvivor()
    {
        var bytes = new byte[] { 7, 8, 9 };
        var hash = Convert.ToHexStringLower(SHA256.HashData(bytes));
        var baulId = await _fixture.CreateBaulAsync();
        var deletedId = await _fixture.AddPhotoAsync(baulId, storageKey: "deleted-key", originalContentHash: hash);
        var deleted = (await _fixture.Photos.GetByIdAsync(deletedId))!;
        await _fixture.Photos.UpdateAsync(deleted.MarkDeleted("some other reason", DateTime.UtcNow));

        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream(bytes);
        var result = await manager.UploadToBaulAsync(baulId, content, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.False(result.Value.AlreadyExisted);
        Assert.NotEqual(deletedId.ToString(), result.Value.Id);
    }

    // Slice 2.5 (docs/.backlog issue #62): global exact-duplicate reuse across users. See
    // MyPhotosReadManagerTests for the "Mis fotos" read-side counterpart of these scenarios.
    [Fact]
    public async Task UploadAsync_ReusesTheCanonicalAsset_WhenADifferentUserUploadsTheExactSameBytes()
    {
        var bytes = new byte[] { 71, 72, 73 };
        var (baulA, chapterA) = await _fixture.CreateBaulWithChapterAsync(baulName: "Baúl A");
        var pedroResult = await new PhotoManager(
                NullLogger<PhotoManager>.Instance, _fixture.Photos, _fixture.Chapters,
                new StaticCurrentUserProvider(CustodioId), new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
                CreatePhotoLifecycleService(), CreatePhotoDtoProjector(), CreatePhotoUploadWorkflow(),
                CreateMyPhotosReadManager(CustodioId),
            new StaticIdGenerator(Guid.NewGuid()), _fixture.Clock, new FakeUnitOfWork())
            .UploadAsync(chapterA, new MemoryStream(bytes), new ClientUploadId(Guid.NewGuid()));
        Assert.True(pedroResult.IsSuccess);

        const string jaimeId = "jaime";
        var (baulB, chapterB) = await _fixture.CreateBaulWithChapterAsync(custodioId: jaimeId, baulName: "Baúl B");
        var jaimeManager = new PhotoManager(
            NullLogger<PhotoManager>.Instance, _fixture.Photos, _fixture.Chapters,
            new StaticCurrentUserProvider(jaimeId), new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            CreatePhotoLifecycleService(), CreatePhotoDtoProjector(), CreatePhotoUploadWorkflow(),
            CreateMyPhotosReadManager(jaimeId),
            new StaticIdGenerator(Guid.NewGuid()), _fixture.Clock, new FakeUnitOfWork());

        var jaimeResult = await jaimeManager.UploadAsync(chapterB, new MemoryStream(bytes), new ClientUploadId(Guid.NewGuid()));

        Assert.True(jaimeResult.IsSuccess);
        Assert.False(jaimeResult.Value.AlreadyExisted, "a genuinely new Photo for Jaime's own baúl, even though the asset is shared");
        // No second PhotoAsset was minted, and no second stored blob — only one upload's worth of
        // bytes ever reached storage.
        Assert.Single(_photoStorage.SavedKeys);
        var pedroAsset = (await _fixture.Photos.GetByIdAsync(new PhotoId(Guid.Parse(pedroResult.Value.Id))))!.PhotoAssetId;
        var jaimeAsset = (await _fixture.Photos.GetByIdAsync(new PhotoId(Guid.Parse(jaimeResult.Value.Id))))!.PhotoAssetId;
        Assert.Equal(pedroAsset, jaimeAsset);
        // Jaime's own upload, nowhere in the response, ever names Pedro or Baúl A.
        Assert.DoesNotContain("Pedro", jaimeResult.Value.Id, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UploadAsync_GivesEachIndependentContributor_TheirOwnUserPhotoAssetRelation()
    {
        var bytes = new byte[] { 81, 82, 83 };
        var (baulA, chapterA) = await _fixture.CreateBaulWithChapterAsync(baulName: "Baúl A");
        await CreateManager(CustodioId).UploadAsync(chapterA, new MemoryStream(bytes), new ClientUploadId(Guid.NewGuid()));

        const string jaimeId = "jaime";
        var (baulB, chapterB) = await _fixture.CreateBaulWithChapterAsync(custodioId: jaimeId, baulName: "Baúl B");
        var jaimeManager = new PhotoManager(
            NullLogger<PhotoManager>.Instance, _fixture.Photos, _fixture.Chapters,
            new StaticCurrentUserProvider(jaimeId), new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            CreatePhotoLifecycleService(), CreatePhotoDtoProjector(), CreatePhotoUploadWorkflow(),
            CreateMyPhotosReadManager(jaimeId),
            new StaticIdGenerator(Guid.NewGuid()), _fixture.Clock, new FakeUnitOfWork());
        await jaimeManager.UploadAsync(chapterB, new MemoryStream(bytes), new ClientUploadId(Guid.NewGuid()));

        var pedrosAssets = await _fixture.Photos.GetByContributorAsync(new UserId(CustodioId));
        var jaimesAssets = await _fixture.Photos.GetByContributorAsync(new UserId(jaimeId));
        Assert.Single(pedrosAssets);
        Assert.Single(jaimesAssets);
        Assert.Equal(pedrosAssets[0].Id, jaimesAssets[0].Id);
    }

    [Fact]
    public async Task AddAssetToBaulAsync_AllowsAContributor_WhoOnlyHasAUserPhotoAssetRelation_FromDedup()
    {
        // Jaime never created this PhotoAsset row (Pedro did) — his ability to add it into
        // another baúl from Mis fotos must come from his own UserPhotoAsset relation, not from
        // PhotoAsset.UploadedBy (see PhotoManager.AddAssetToBaulAsync).
        var bytes = new byte[] { 91, 92, 93 };
        var (baulA, chapterA) = await _fixture.CreateBaulWithChapterAsync(baulName: "Baúl A");
        var pedroUpload = await CreateManager(CustodioId).UploadAsync(chapterA, new MemoryStream(bytes), new ClientUploadId(Guid.NewGuid()));

        const string jaimeId = "jaime";
        var (baulB, chapterB) = await _fixture.CreateBaulWithChapterAsync(custodioId: jaimeId, baulName: "Baúl B");
        var jaimeManager = new PhotoManager(
            NullLogger<PhotoManager>.Instance, _fixture.Photos, _fixture.Chapters,
            new StaticCurrentUserProvider(jaimeId), new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            CreatePhotoLifecycleService(), CreatePhotoDtoProjector(), CreatePhotoUploadWorkflow(),
            CreateMyPhotosReadManager(jaimeId),
            new StaticIdGenerator(Guid.NewGuid()), _fixture.Clock, new FakeUnitOfWork());
        await jaimeManager.UploadAsync(chapterB, new MemoryStream(bytes), new ClientUploadId(Guid.NewGuid()));
        var jaimesAssetId = (await _fixture.Photos.GetByContributorAsync(new UserId(jaimeId)))[0].Id;

        var baulC = await _fixture.CreateBaulAsync("Baúl C", jaimeId);
        var addResult = await jaimeManager.AddAssetToBaulAsync(jaimesAssetId, baulC);

        Assert.True(addResult.IsSuccess);
        Assert.Equal("Baúl C", addResult.Value.BaulName);
    }

    [Fact]
    public async Task AddAssetToBaulAsync_DeniesAUser_WithNoUserPhotoAssetRelationToTheAsset()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, storageKey: "someone-elses.jpg");
        var assetId = (await _fixture.Photos.GetByIdAsync(photoId))!.PhotoAssetId;
        var targetBaul = await _fixture.CreateBaulAsync("Otro baúl", "stranger");

        var manager = CreateManager("stranger");
        var result = await manager.AddAssetToBaulAsync(assetId, targetBaul);

        Assert.True(result.IsFailure);
        Assert.Equal(Ne2Studio.Common.ApplicationErrorCode.Forbidden, result.Error.Code);
    }

    [Fact]
    public async Task GetByChapterIdAsync_ShouldFail_WhenChapterDoesNotExist()
    {
        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetByChapterIdAsync(new ChapterId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal("Chapter not found", result.Error.Message);
    }

    [Fact]
    public async Task GetByChapterIdAsync_ShouldLogWarning_WhenChapterDoesNotExist()
    {
        var logger = new CapturingLogger<PhotoReadManager>();
        var chapterId = new ChapterId(Guid.NewGuid());
        var readManager = CreateReadManager(CustodioId, logger: logger);

        await readManager.GetByChapterIdAsync(chapterId);

        var warning = Assert.Single(logger.Entries, entry => entry.Level == LogLevel.Warning);
        Assert.Equal($"Photos by chapter rejected: chapter not found {chapterId}", warning.Message);
    }

    [Fact]
    public async Task GetByChapterIdAsync_ShouldResolveEachPhotosRecuerdoCount_Independently()
    {
        // Targets IPhotoListReadModel's batched recuerdo-count lookup specifically: two photos
        // with different recuerdo counts must each keep their own — the exact mistake a broken
        // dictionary lookup in the batching would produce is one photo's count leaking onto
        // another's DTO.
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var quietPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "quiet-key");
        var busyPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "busy-key");
        await _fixture.Recuerdos.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), busyPhotoId, chapterId, baulId, new UserId(CustodioId), "uno", _fixture.Clock.UtcNow()));
        await _fixture.Recuerdos.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), busyPhotoId, chapterId, baulId, new UserId(CustodioId), "dos", _fixture.Clock.UtcNow()));

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetByChapterIdAsync(chapterId);

        Assert.True(result.IsSuccess);
        var dtos = result.Value.ToList();
        Assert.Equal(0, dtos.Single(p => p.Id == quietPhotoId.ToString()).RecuerdoCount);
        Assert.Equal(2, dtos.Single(p => p.Id == busyPhotoId.ToString()).RecuerdoCount);
    }

    [Fact]
    public async Task MoveAsync_ShouldReassignChapterId_AndUpdatePhotoCounts()
    {
        var (baulId, sourceChapterId) = await _fixture.CreateBaulWithChapterAsync();
        var targetChapterId = await _fixture.AddChapterAsync(baulId, "Destino");
        var photoId = await _fixture.AddPhotoAsync(baulId, sourceChapterId);
        var sourceChapter = await _fixture.Chapters.GetByIdAsync(sourceChapterId);
        var sourcePhoto = await _fixture.Photos.GetByIdAsync(photoId);
        await _fixture.Chapters.UpdateAsync(sourceChapter!.WithPhotoAdded(sourcePhoto!.Id, _fixture.Clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.MoveAsync(photoId, targetChapterId);

        Assert.True(result.IsSuccess);
        Assert.Equal(targetChapterId.ToString(), result.Value.ChapterId);

        var updatedSource = await _fixture.Chapters.GetByIdAsync(sourceChapterId);
        var updatedTarget = await _fixture.Chapters.GetByIdAsync(targetChapterId);
        Assert.Equal(0, updatedSource!.PhotoCount);
        Assert.Equal(1, updatedTarget!.PhotoCount);
    }

    [Fact]
    public async Task MoveAsync_ShouldFail_WhenTargetChapterInDifferentBaul()
    {
        var (baulId, sourceChapterId) = await _fixture.CreateBaulWithChapterAsync();
        var (_, otherBaulChapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, sourceChapterId);

        var manager = CreateManager(CustodioId);
        var result = await manager.MoveAsync(photoId, otherBaulChapterId);

        Assert.True(result.IsFailure);
        Assert.Equal("Target chapter not found", result.Error.Message);
    }

    // "Add to another baúl" (docs/.backlog issue #62, Slice 2).
    [Fact]
    public async Task AddToBaulAsync_CreatesANewPhoto_SharingTheSamePhotoAsset()
    {
        var sourceBaulId = await _fixture.CreateBaulAsync("Origen");
        var targetBaulId = await _fixture.CreateBaulAsync("Destino");
        var sourcePhotoId = await _fixture.AddPhotoAsync(sourceBaulId, storageKey: "shared/key.jpg");

        var manager = CreateManager(CustodioId, nextAddToBaulId: Guid.NewGuid());
        var result = await manager.AddToBaulAsync(sourcePhotoId, targetBaulId);

        Assert.True(result.IsSuccess);
        var newPhotoDto = result.Value;
        Assert.NotEqual(sourcePhotoId.ToString(), newPhotoDto.Id);
        Assert.Equal(targetBaulId.ToString(), newPhotoDto.BaulId);

        var sourcePhoto = await _fixture.Photos.GetByIdAsync(sourcePhotoId);
        var newPhoto = await _fixture.Photos.GetByIdAsync(new PhotoId(Guid.Parse(newPhotoDto.Id)));
        Assert.Equal(sourcePhoto!.PhotoAssetId, newPhoto!.PhotoAssetId);
        Assert.Equal("shared/key.jpg", newPhoto.StorageKey);
    }

    [Fact]
    public async Task AddToBaulAsync_DoesNotCopySourceBaulSpecificContext()
    {
        var (sourceBaulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var targetBaulId = await _fixture.CreateBaulAsync("Destino");
        var date = PhotoDate.Parse(2019, 6, 1).Value;
        var sourcePhotoId = await _fixture.AddPhotoAsync(
            sourceBaulId, chapterId, date: date, clientUploadId: Guid.NewGuid(), uploadBatchId: Guid.NewGuid());

        var manager = CreateManager(CustodioId);
        var result = await manager.AddToBaulAsync(sourcePhotoId, targetBaulId);

        Assert.True(result.IsSuccess);
        var sourcePhoto = await _fixture.Photos.GetByIdAsync(sourcePhotoId);
        var newPhoto = await _fixture.Photos.GetByIdAsync(new PhotoId(Guid.Parse(result.Value.Id)));
        // TakenAt is the one deliberate exception — copied as a convenience initial value.
        Assert.Equal(date, newPhoto!.TakenAt);
        Assert.Null(newPhoto.ChapterId);
        Assert.Null(newPhoto.ClientUploadId);
        // UploadBatchId IS set, unlike every other baúl-specific field above — issue #81: a
        // photo added to another baúl still needs a "photo added" feed card there. But it's a
        // fresh id of its own (a batch of one), never the source photo's own batch, which
        // belongs to a different action in a different baúl.
        Assert.NotNull(newPhoto.UploadBatchId);
        Assert.NotEqual(sourcePhoto!.UploadBatchId, newPhoto.UploadBatchId);
        Assert.Equal(PhotoStatus.Active, newPhoto.Status);
        Assert.NotEqual(default, newPhoto.CreatedAt);
    }

    [Fact]
    public async Task AddToBaulAsync_ChangingTheNewPhotosContext_DoesNotAffectTheSourcePhoto()
    {
        var sourceBaulId = await _fixture.CreateBaulAsync("Origen");
        var targetBaulId = await _fixture.CreateBaulAsync("Destino");
        var sourcePhotoId = await _fixture.AddPhotoAsync(sourceBaulId, date: PhotoDate.Parse(2020, 1, 1).Value);

        var manager = CreateManager(CustodioId);
        var addResult = await manager.AddToBaulAsync(sourcePhotoId, targetBaulId);
        var newPhotoId = new PhotoId(Guid.Parse(addResult.Value.Id));

        var newDate = PhotoDate.Parse(2021, 12, 25).Value;
        await manager.ChangeDateAsync(newPhotoId, newDate);

        var sourcePhoto = await _fixture.Photos.GetByIdAsync(sourcePhotoId);
        Assert.Equal(PhotoDate.Parse(2020, 1, 1).Value, sourcePhoto!.TakenAt);
    }

    [Fact]
    public async Task AddToBaulAsync_ShouldBeIdempotent_WhenTheAssetIsAlreadyActiveInTheTargetBaul()
    {
        var sourceBaulId = await _fixture.CreateBaulAsync("Origen");
        var targetBaulId = await _fixture.CreateBaulAsync("Destino");
        var sourcePhotoId = await _fixture.AddPhotoAsync(sourceBaulId);

        var manager = CreateManager(CustodioId);
        var first = await manager.AddToBaulAsync(sourcePhotoId, targetBaulId);
        var second = await manager.AddToBaulAsync(sourcePhotoId, targetBaulId);

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);
        Assert.Equal(first.Value.Id, second.Value.Id);

        var sourcePhoto = await _fixture.Photos.GetByIdAsync(sourcePhotoId);
        var activeInTarget = (await _fixture.Photos.GetActiveByBaulIdAsync(targetBaulId))
            .Where(p => p.PhotoAssetId == sourcePhoto!.PhotoAssetId)
            .ToList();
        Assert.Single(activeInTarget);
    }

    [Fact]
    public async Task AddToBaulAsync_ShouldFail_WhenCallerCannotAccessTheSourcePhoto()
    {
        var sourceBaulId = await _fixture.CreateBaulAsync("Origen", custodioId: "custodio-owner");
        var targetBaulId = await _fixture.CreateBaulAsync("Destino", custodioId: "stranger");
        var sourcePhotoId = await _fixture.AddPhotoAsync(sourceBaulId, uploadedBy: "custodio-owner");

        var manager = CreateManager("stranger");
        var result = await manager.AddToBaulAsync(sourcePhotoId, targetBaulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task AddToBaulAsync_ShouldFail_WhenCallerCannotAddContentToTheTargetBaul()
    {
        var sourceBaulId = await _fixture.CreateBaulAsync("Origen");
        var sourcePhotoId = await _fixture.AddPhotoAsync(sourceBaulId);
        var targetBaulId = await _fixture.CreateBaulAsync("Destino", custodioId: "other-custodio");

        var manager = CreateManager(CustodioId);
        var result = await manager.AddToBaulAsync(sourcePhotoId, targetBaulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task AddToBaulAsync_ShouldSucceed_WhenCallerIsAMemberOfBothBaules()
    {
        var sourceBaulId = await _fixture.CreateBaulAsync("Origen", custodioId: "owner");
        var targetBaulId = await _fixture.CreateBaulAsync("Destino", custodioId: "owner");
        await _fixture.AddColaboradorAsync(sourceBaulId, "colaborador-1");
        await _fixture.AddColaboradorAsync(targetBaulId, "colaborador-1");
        var sourcePhotoId = await _fixture.AddPhotoAsync(sourceBaulId, uploadedBy: "owner");

        var manager = CreateManager("colaborador-1");
        var result = await manager.AddToBaulAsync(sourcePhotoId, targetBaulId);

        Assert.True(result.IsSuccess);
    }

    // "Add to another baúl" from Mis fotos (docs/.backlog issue #62, Slice 2 — Mis fotos
    // wiring): same domain factory/DB constraint as AddToBaulAsync above, but authorized off
    // PhotoAsset.UploadedBy instead of a source Photo — see AddAssetToBaulAsync's own comment.
    [Fact]
    public async Task AddAssetToBaulAsync_CreatesANewPhoto_SharingTheSamePhotoAsset()
    {
        var sourceBaulId = await _fixture.CreateBaulAsync("Origen");
        var targetBaulId = await _fixture.CreateBaulAsync("Destino");
        var sourcePhotoId = await _fixture.AddPhotoAsync(sourceBaulId, storageKey: "shared/key.jpg", uploadedBy: CustodioId);
        var assetId = new PhotoAssetId(sourcePhotoId.Value);

        var manager = CreateManager(CustodioId, nextAddToBaulId: Guid.NewGuid());
        var result = await manager.AddAssetToBaulAsync(assetId, targetBaulId);

        Assert.True(result.IsSuccess);
        Assert.Equal(targetBaulId.ToString(), result.Value.BaulId);

        var sourcePhoto = await _fixture.Photos.GetByIdAsync(sourcePhotoId);
        var newPhoto = await _fixture.Photos.GetActiveByAssetIdAsync(targetBaulId, assetId);
        Assert.NotNull(newPhoto);
        Assert.Equal(sourcePhoto!.PhotoAssetId, newPhoto!.PhotoAssetId);
        Assert.Equal("shared/key.jpg", newPhoto.StorageKey);
        Assert.NotEqual(sourcePhotoId, newPhoto.Id);
    }

    [Fact]
    public async Task AddAssetToBaulAsync_DoesNotCopySourceBaulSpecificContext()
    {
        var (sourceBaulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var targetBaulId = await _fixture.CreateBaulAsync("Destino");
        var date = PhotoDate.Parse(2019, 6, 1).Value;
        var sourcePhotoId = await _fixture.AddPhotoAsync(
            sourceBaulId, chapterId, date: date, clientUploadId: Guid.NewGuid(), uploadBatchId: Guid.NewGuid(), uploadedBy: CustodioId);
        var assetId = new PhotoAssetId(sourcePhotoId.Value);

        var manager = CreateManager(CustodioId);
        var result = await manager.AddAssetToBaulAsync(assetId, targetBaulId);

        Assert.True(result.IsSuccess);
        var sourcePhoto = await _fixture.Photos.GetByIdAsync(sourcePhotoId);
        var newPhoto = await _fixture.Photos.GetActiveByAssetIdAsync(targetBaulId, assetId);
        // TakenAt is the one deliberate exception — copied as a convenience initial value.
        Assert.Equal(date, newPhoto!.TakenAt);
        Assert.Null(newPhoto.ChapterId);
        Assert.Null(newPhoto.ClientUploadId);
        // UploadBatchId IS set, unlike every other baúl-specific field above — issue #81: a
        // photo added from Mis fotos still needs a "photo added" feed card there. But it's a
        // fresh id of its own (a batch of one) unless the caller shares one across a multi-select
        // (see AddAssetsToBaulBatchAsync), never the source photo's own batch.
        Assert.NotNull(newPhoto.UploadBatchId);
        Assert.NotEqual(sourcePhoto!.UploadBatchId, newPhoto.UploadBatchId);
        Assert.Equal(PhotoStatus.Active, newPhoto.Status);
        Assert.NotEqual(default, newPhoto.CreatedAt);
    }

    [Fact]
    public async Task AddAssetToBaulAsync_ShouldNotCreateANewPhotoAsset()
    {
        var sourceBaulId = await _fixture.CreateBaulAsync("Origen");
        var targetBaulId = await _fixture.CreateBaulAsync("Destino");
        var sourcePhotoId = await _fixture.AddPhotoAsync(sourceBaulId, uploadedBy: CustodioId);
        var assetId = new PhotoAssetId(sourcePhotoId.Value);

        var manager = CreateManager(CustodioId);
        await manager.AddAssetToBaulAsync(assetId, targetBaulId);

        var appearances = await _fixture.Photos.GetActiveByAssetIdsAsync([assetId]);
        Assert.All(appearances, p => Assert.Equal(assetId, p.PhotoAssetId));
        Assert.Equal(2, appearances.Count);
    }

    [Fact]
    public async Task AddAssetToBaulAsync_ShouldBeIdempotent_WhenTheAssetIsAlreadyActiveInTheTargetBaul()
    {
        var sourceBaulId = await _fixture.CreateBaulAsync("Origen");
        var targetBaulId = await _fixture.CreateBaulAsync("Destino");
        var sourcePhotoId = await _fixture.AddPhotoAsync(sourceBaulId, uploadedBy: CustodioId);
        var assetId = new PhotoAssetId(sourcePhotoId.Value);

        var manager = CreateManager(CustodioId);
        var first = await manager.AddAssetToBaulAsync(assetId, targetBaulId);
        var second = await manager.AddAssetToBaulAsync(assetId, targetBaulId);

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);

        var activeInTarget = (await _fixture.Photos.GetActiveByBaulIdAsync(targetBaulId))
            .Where(p => p.PhotoAssetId == assetId)
            .ToList();
        Assert.Single(activeInTarget);
    }

    [Fact]
    public async Task AddAssetToBaulAsync_ShouldFail_WhenCallerDidNotOriginallyUploadTheAsset()
    {
        var sourceBaulId = await _fixture.CreateBaulAsync("Origen", custodioId: "custodio-owner");
        var targetBaulId = await _fixture.CreateBaulAsync("Destino", custodioId: "custodio-owner");
        var sourcePhotoId = await _fixture.AddPhotoAsync(sourceBaulId, uploadedBy: "custodio-owner");
        var assetId = new PhotoAssetId(sourcePhotoId.Value);

        // "stranger" is even a member of the target baúl — access must still be denied, because
        // this asset isn't theirs to begin with (arbitrary/inaccessible PhotoAssetId).
        await _fixture.AddColaboradorAsync(targetBaulId, "stranger");
        var manager = CreateManager("stranger");
        var result = await manager.AddAssetToBaulAsync(assetId, targetBaulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task AddAssetToBaulAsync_ShouldFail_WhenCallerCannotAddContentToTheTargetBaul()
    {
        var sourceBaulId = await _fixture.CreateBaulAsync("Origen");
        var sourcePhotoId = await _fixture.AddPhotoAsync(sourceBaulId, uploadedBy: CustodioId);
        var assetId = new PhotoAssetId(sourcePhotoId.Value);
        var targetBaulId = await _fixture.CreateBaulAsync("Destino", custodioId: "other-custodio");

        var manager = CreateManager(CustodioId);
        var result = await manager.AddAssetToBaulAsync(assetId, targetBaulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task AddAssetToBaulAsync_ShouldSucceed_WhenCallerUploadedTheAssetAndIsMemberOfTheTargetBaul()
    {
        var sourceBaulId = await _fixture.CreateBaulAsync("Origen", custodioId: "owner");
        var targetBaulId = await _fixture.CreateBaulAsync("Destino", custodioId: "other-owner");
        await _fixture.AddColaboradorAsync(targetBaulId, "colaborador-1");
        var sourcePhotoId = await _fixture.AddPhotoAsync(sourceBaulId, uploadedBy: "colaborador-1");
        var assetId = new PhotoAssetId(sourcePhotoId.Value);

        var manager = CreateManager("colaborador-1");
        var result = await manager.AddAssetToBaulAsync(assetId, targetBaulId);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task DeleteAsync_ShouldHidePhotoFromChapterListing()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);

        var manager = CreateManager(CustodioId);
        await manager.DeleteAsync(photoId, "Ya no aplica");

        var result = await CreateReadManager(CustodioId).GetByChapterIdAsync(chapterId);
        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value);
    }

    [Fact]
    public async Task DeleteAsync_ShouldDenyAccess_ForColaboradorRole()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);
        const string colaboradorId = "colaborador-1";
        await _fixture.AddColaboradorAsync(baulId, colaboradorId);

        var manager = CreateManager(colaboradorId);
        var result = await manager.DeleteAsync(photoId, "reason");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);

        var photo = await _fixture.Photos.GetByIdAsync(photoId);
        Assert.Equal(PhotoStatus.Active, photo!.Status);
    }

    [Fact]
    public async Task DeleteAsync_ShouldFail_WhenPhotoNotFound()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.DeleteAsync(new PhotoId(Guid.NewGuid()), "reason");

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error.Message);
    }

    [Fact]
    public async Task DeleteAsync_ShouldAllow_ForNonAdminOwnerDeletingRecentOwnUpload()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        const string colaboradorId = "colaborador-1";
        await _fixture.AddColaboradorAsync(baulId, colaboradorId);
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId, uploadedBy: colaboradorId, createdAt: _fixture.Clock.UtcNow());

        var manager = CreateManager(colaboradorId);
        var result = await manager.DeleteAsync(photoId, "me he equivocado");

        Assert.True(result.IsSuccess);
        var photo = await _fixture.Photos.GetByIdAsync(photoId);
        Assert.Equal(PhotoStatus.Deleted, photo!.Status);
    }

    [Fact]
    public async Task DeleteAsync_ShouldDenyAccess_ForNonAdminOwnerPastGracePeriod()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        const string colaboradorId = "colaborador-1";
        await _fixture.AddColaboradorAsync(baulId, colaboradorId);
        var uploadedAt = _fixture.Clock.UtcNow() - PhotoDeletePolicy.OwnPhotoGracePeriod;
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId, uploadedBy: colaboradorId, createdAt: uploadedAt);

        var manager = CreateManager(colaboradorId);
        var result = await manager.DeleteAsync(photoId, "reason");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
        var photo = await _fixture.Photos.GetByIdAsync(photoId);
        Assert.Equal(PhotoStatus.Active, photo!.Status);
    }

    [Fact]
    public async Task DeleteAsync_ShouldDenyAccess_ForNonAdminDeletingSomeoneElsesRecentUpload()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        const string colaboradorId = "colaborador-1";
        await _fixture.AddColaboradorAsync(baulId, colaboradorId);
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId, uploadedBy: CustodioId, createdAt: _fixture.Clock.UtcNow());

        var manager = CreateManager(colaboradorId);
        var result = await manager.DeleteAsync(photoId, "reason");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task UploadToBaulAsync_ShouldSaveFile_WithNullChapterId()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadToBaulAsync(baulId, content, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.ChapterId);
        Assert.Single(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task GetLooseByBaulIdAsync_ShouldReturnOnlyChapterlessPhotos()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        await _fixture.AddPhotoAsync(baulId, chapterId, "in-chapter-key");
        await _fixture.AddPhotoAsync(baulId, storageKey: "loose-key");

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetLooseByBaulIdAsync(baulId);

        Assert.True(result.IsSuccess);
        var photo = Assert.Single(result.Value);
        Assert.Null(photo.ChapterId);
    }

    [Fact]
    public async Task GetPageAsync_ShouldReturnBaulWidePhotos_InChronologicalOrder_WithUndatedLast()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var earlyDate = PhotoDates.Of(2019, 6, 1);
        var laterDate = PhotoDates.Of(2020, 1, 1);

        // Created out of chronological order to prove the manager sorts, rather than
        // happening to preserve insertion order.
        var laterPhotoId = await _fixture.AddPhotoAsync(baulId, storageKey: "later-key", date: laterDate);
        var undatedPhotoId = await _fixture.AddPhotoAsync(baulId, storageKey: "undated-key");
        var earlyPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "early-key", earlyDate);

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetPageAsync(baulId, null, 0, 10);

        Assert.True(result.IsSuccess);
        Assert.Equal(
            new[] { earlyPhotoId.ToString(), laterPhotoId.ToString(), undatedPhotoId.ToString() },
            result.Value.Items.Select(p => p.Id).ToList());
        Assert.False(result.Value.HasMore);
    }

    [Fact]
    public async Task GetPageAsync_ShouldReturnOnlyThatChaptersPhotos_WhenChapterIdGiven()
    {
        var (baulId, sourceChapterId) = await _fixture.CreateBaulWithChapterAsync();
        var targetChapterId = await _fixture.AddChapterAsync(baulId, "Destino");
        var inSourceChapterId = await _fixture.AddPhotoAsync(baulId, sourceChapterId, "source-key");
        await _fixture.AddPhotoAsync(baulId, targetChapterId, "target-key");

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetPageAsync(baulId, sourceChapterId, 0, 10);

        Assert.True(result.IsSuccess);
        var photo = Assert.Single(result.Value.Items);
        Assert.Equal(inSourceChapterId.ToString(), photo.Id);
    }

    [Fact]
    public async Task GetPageAsync_ShouldSetHasMore_WhenMorePhotosThanTake()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        for (var i = 0; i < 3; i++)
        {
            await _fixture.AddPhotoAsync(baulId, chapterId, $"key-{i}");
        }

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetPageAsync(baulId, null, 0, 2);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Items.Count);
        Assert.True(result.Value.HasMore);
    }

    [Fact]
    public async Task GetPageAsync_ShouldClearHasMore_WhenAllPhotosFitInPage()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        for (var i = 0; i < 2; i++)
        {
            await _fixture.AddPhotoAsync(baulId, chapterId, $"key-{i}");
        }

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetPageAsync(baulId, null, 0, 10);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Items.Count);
        Assert.False(result.Value.HasMore);
    }

    [Fact]
    public async Task GetPageAsync_ShouldExcludeDeletedPhotos()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);

        await CreateManager(CustodioId).DeleteAsync(photoId, "reason");
        var result = await CreateReadManager(CustodioId).GetPageAsync(baulId, null, 0, 10);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value.Items);
    }

    [Fact]
    public async Task GetPageAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();
        var readManager = CreateReadManager("stranger");
        var result = await readManager.GetPageAsync(baulId, null, 0, 10);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task GetPageAsync_ShouldFail_WhenChapterDoesNotBelongToBaul()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();
        var (_, otherChapterId) = await _fixture.CreateBaulWithChapterAsync();

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetPageAsync(baulId, otherChapterId, 0, 10);

        Assert.True(result.IsFailure);
        Assert.Equal("Chapter not found", result.Error.Message);
    }

    [Fact]
    public async Task UploadAsync_ShouldLeavePhotoUndated_WhenNoDateGivenAndNoExifFound()
    {
        var (_, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(chapterId, content, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.DateYear);
        Assert.Null(result.Value.DateMonth);
        Assert.Null(result.Value.DateDay);
    }

    [Fact]
    public async Task UploadAsync_ShouldUseExifDate()
    {
        var (_, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        _photoDateExtractor.NextResult = (2019, 8, 3);
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(chapterId, content, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Equal(2019, result.Value.DateYear);
        Assert.Equal(8, result.Value.DateMonth);
        Assert.Equal(3, result.Value.DateDay);
    }

    [Fact]
    public async Task ChangeDateAsync_ShouldUpdatePhotoDate()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);

        var manager = CreateManager(CustodioId);
        var result = await manager.ChangeDateAsync(photoId, PhotoDates.Of(2020, 5));

        Assert.True(result.IsSuccess);
        Assert.Equal(2020, result.Value.DateYear);
        Assert.Equal(5, result.Value.DateMonth);
        Assert.Null(result.Value.DateDay);
    }

    [Fact]
    public async Task ClearDateAsync_ShouldClearPhotoDate()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId, date: PhotoDates.Of(2020, 5, 12));

        var manager = CreateManager(CustodioId);
        var result = await manager.ClearDateAsync(photoId);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.DateYear);
        Assert.Null(result.Value.DateMonth);
        Assert.Null(result.Value.DateDay);
    }

    [Fact]
    public async Task ClearDateAsync_ShouldFail_WhenPhotoNotFound()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.ClearDateAsync(new PhotoId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task DownloadAsync_ShouldReturnOriginalContentAndFileName()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var storageKey = $"{CustodioId}/{Guid.NewGuid()}-vacaciones.jpg";
        await _photoStorage.SaveAsync(storageKey, new MemoryStream([1, 2, 3]), "image/jpeg");
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId, storageKey);

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.DownloadAsync(photoId);

        Assert.True(result.IsSuccess);
        Assert.Equal("image/jpeg", result.Value.ContentType);
        Assert.Equal("vacaciones.jpg", result.Value.FileName);
        using var buffer = new MemoryStream();
        await result.Value.Content.CopyToAsync(buffer);
        Assert.Equal(new byte[] { 1, 2, 3 }, buffer.ToArray());
    }

    [Fact]
    public async Task DownloadAsync_ShouldFail_WhenPhotoNotFound()
    {
        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.DownloadAsync(new PhotoId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error.Message);
    }

    [Fact]
    public async Task DeleteBatchAsync_ShouldDeleteAllValidPhotos_AndSkipInaccessibleOnes()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var ownPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "key-1");

        var otherBaulId = await _fixture.CreateBaulAsync("Otro", "someone-else");
        var foreignPhotoId = await _fixture.AddPhotoAsync(otherBaulId, storageKey: "key-2", uploadedBy: "someone-else");

        var manager = CreateManager(CustodioId);
        var result = await manager.DeleteBatchAsync([ownPhotoId, foreignPhotoId], "Se borrarán 2 fotos");

        Assert.True(result.IsSuccess);

        var ownPhoto = await _fixture.Photos.GetByIdAsync(ownPhotoId);
        Assert.Equal(PhotoStatus.Deleted, ownPhoto!.Status);

        var foreignPhoto = await _fixture.Photos.GetByIdAsync(foreignPhotoId);
        Assert.Equal(PhotoStatus.Active, foreignPhoto!.Status);
    }

    [Fact]
    public async Task DeleteBatchAsync_ShouldApplySameReason_ToEveryDeletedPhoto()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var firstPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "key-1");
        var secondPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "key-2");

        var manager = CreateManager(CustodioId);
        var result = await manager.DeleteBatchAsync([firstPhotoId, secondPhotoId], "Se borrarán 2 fotos");

        Assert.True(result.IsSuccess);
        var firstPhoto = await _fixture.Photos.GetByIdAsync(firstPhotoId);
        var secondPhoto = await _fixture.Photos.GetByIdAsync(secondPhotoId);
        Assert.Equal(PhotoStatus.Deleted, firstPhoto!.Status);
        Assert.Equal(PhotoStatus.Deleted, secondPhoto!.Status);
        Assert.Equal("Se borrarán 2 fotos", firstPhoto.DeletionReason);
        Assert.Equal("Se borrarán 2 fotos", secondPhoto.DeletionReason);
    }

    [Fact]
    public async Task ChangeDateBatchAsync_ShouldUpdateAllValidPhotos_AndSkipInaccessibleOnes()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var ownPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "key-1");

        var otherBaulId = await _fixture.CreateBaulAsync("Otro", "someone-else");
        var foreignPhotoId = await _fixture.AddPhotoAsync(otherBaulId, storageKey: "key-2", uploadedBy: "someone-else");

        var manager = CreateManager(CustodioId);
        var result = await manager.ChangeDateBatchAsync([ownPhotoId, foreignPhotoId], PhotoDates.Of(2018));

        Assert.True(result.IsSuccess);
        var updated = Assert.Single(result.Value);
        Assert.Equal(ownPhotoId.ToString(), updated.Id);
        Assert.Equal(2018, updated.DateYear);
    }

    [Fact]
    public async Task ClearDateBatchAsync_ShouldClearAllValidPhotos_AndSkipInaccessibleOnes()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var ownPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "key-1", date: PhotoDates.Of(2018, 3));

        var otherBaulId = await _fixture.CreateBaulAsync("Otro", "someone-else");
        var foreignPhotoId = await _fixture.AddPhotoAsync(
            otherBaulId, storageKey: "key-2", uploadedBy: "someone-else", date: PhotoDates.Of(2018, 3));

        var manager = CreateManager(CustodioId);
        var result = await manager.ClearDateBatchAsync([ownPhotoId, foreignPhotoId]);

        Assert.True(result.IsSuccess);
        var updated = Assert.Single(result.Value);
        Assert.Equal(ownPhotoId.ToString(), updated.Id);
        Assert.Null(updated.DateYear);
    }

    [Fact]
    public async Task GetByPersonaIdAsync_ShouldReturnTaggedPhotos_OrderedChronologically()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuelo Antonio");

        var newerPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "newer", PhotoDates.Of(2020, 5, 10));
        var olderPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "older", PhotoDates.Of(1998, 6, 15));
        var undatedPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "undated");

        var tagManager = CreateTagManager(CustodioId);
        await tagManager.SetTaggedPersonasAsync(newerPhotoId, [personaId]);
        await tagManager.SetTaggedPersonasAsync(olderPhotoId, [personaId]);
        await tagManager.SetTaggedPersonasAsync(undatedPhotoId, [personaId]);

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetByPersonaIdAsync(baulId, personaId);

        Assert.True(result.IsSuccess);
        Assert.Equal([olderPhotoId.ToString(), newerPhotoId.ToString(), undatedPhotoId.ToString()], result.Value.Select(p => p.Id));
    }

    [Fact]
    public async Task GetByPersonaIdAsync_ShouldExcludeSoftDeletedPhotos()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuelo Antonio");

        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);

        await CreateTagManager(CustodioId).SetTaggedPersonasAsync(photoId, [personaId]);
        await CreateManager(CustodioId).DeleteAsync(photoId, "duplicada");

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetByPersonaIdAsync(baulId, personaId);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value);
    }

    [Fact]
    public async Task GetByPersonaIdAsync_ShouldFail_WhenPersonaBelongsToAnotherBaul()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();
        var otherBaulId = await _fixture.CreateBaulAsync("Otro", "someone-else");
        var foreignPersonaId = await _fixture.AddPendingPersonaAsync(otherBaulId, "Ajeno");

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetByPersonaIdAsync(baulId, foreignPersonaId);

        Assert.True(result.IsFailure);
        Assert.Equal("Persona not found", result.Error.Message);
    }

    [Fact]
    public async Task GetUntaggedSuggestionAsync_ShouldReturnNull_WhenBaulHasNoPhotos()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();
        var readManager = CreateReadManager(CustodioId);

        var result = await readManager.GetUntaggedSuggestionAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value);
    }

    [Fact]
    public async Task GetUntaggedSuggestionAsync_ShouldReturnNull_WhenEveryPhotoIsAlreadyTagged()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var personaId = await _fixture.AddColaboradorAsync(baulId, "user-1");
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);
        await _fixture.PhotoPersonaTags.SetTagsAsync(photoId, baulId, [personaId], _fixture.Clock.UtcNow());

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetUntaggedSuggestionAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value);
    }

    [Fact]
    public async Task GetUntaggedSuggestionAsync_ShouldSkipTaggedPhotos_AndReturnAnUntaggedOne()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var personaId = await _fixture.AddColaboradorAsync(baulId, "user-1");
        var taggedPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId);
        await _fixture.PhotoPersonaTags.SetTagsAsync(taggedPhotoId, baulId, [personaId], _fixture.Clock.UtcNow());
        var untaggedPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId);

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetUntaggedSuggestionAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(untaggedPhotoId.ToString(), result.Value!.Id);
    }

    [Fact]
    public async Task GetUntaggedSuggestionAsync_ShouldVaryAcrossCalls_InsteadOfAlwaysPickingTheSamePhoto()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var now = _fixture.Clock.UtcNow();
        var photoIds = new List<PhotoId>();
        for (var i = 0; i < 20; i++)
        {
            var photo = PhotoMother.Create(
                new PhotoId(Guid.NewGuid()), chapterId, baulId, $"key-{i}", null, new UserId(CustodioId), now.AddDays(-i));
            await _fixture.Photos.CreateAsync(photo);
            photoIds.Add(photo.Id);
        }

        var readManager = CreateReadManager(CustodioId);
        var seen = new HashSet<string>();
        for (var i = 0; i < 30; i++)
        {
            var result = await readManager.GetUntaggedSuggestionAsync(baulId);
            Assert.True(result.IsSuccess);
            Assert.Contains(result.Value!.Id, photoIds.Select(id => id.ToString()));
            seen.Add(result.Value!.Id);
        }

        // With 20 untagged candidates, 30 identical picks in a row would be a ~1-in-20^29 fluke —
        // this only fails if the suggestion stopped being random (e.g. reverted to always the
        // oldest/newest photo).
        Assert.True(seen.Count > 1, "Expected the suggestion to vary across calls, but it never did.");
    }

    [Fact]
    public async Task GetUntaggedSuggestionAsync_ShouldIgnoreDeletedPhotos()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);
        await CreateManager(CustodioId).DeleteAsync(photoId, "reason");

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetUntaggedSuggestionAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value);
    }

    [Fact]
    public async Task GetUntaggedSuggestionAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();
        var readManager = CreateReadManager("stranger");

        var result = await readManager.GetUntaggedSuggestionAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task GetUntaggedSuggestionAsync_ShouldIgnorePhotosConfirmedAsHavingNoPersonas()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);

        var confirmResult = await CreateManager(CustodioId).ConfirmNoPersonasAsync(photoId);
        Assert.True(confirmResult.IsSuccess);

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetUntaggedSuggestionAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value);
    }

    [Fact]
    public async Task GetMemorySuggestionAsync_ShouldReturnNull_WhenBaulHasNoPhotos()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();
        var readManager = CreateReadManager(CustodioId);

        var result = await readManager.GetMemorySuggestionAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value);
    }

    [Fact]
    public async Task GetMemorySuggestionAsync_ShouldSkipPhotosWithARecuerdo_AndReturnOneWithout()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var withMemoryId = await _fixture.AddPhotoAsync(baulId, chapterId);
        await _fixture.Recuerdos.CreateAsync(
            new Recuerdo(new RecuerdoId(Guid.NewGuid()), withMemoryId, chapterId, baulId, new UserId(CustodioId), "ya escrito", _fixture.Clock.UtcNow()));
        var withoutMemoryId = await _fixture.AddPhotoAsync(baulId, chapterId);

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetMemorySuggestionAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(withoutMemoryId.ToString(), result.Value!.Id);
    }

    [Fact]
    public async Task GetMemorySuggestionAsync_ShouldIgnoreDeletedPhotos()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);
        await CreateManager(CustodioId).DeleteAsync(photoId, "reason");

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetMemorySuggestionAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value);
    }

    [Fact]
    public async Task GetMemorySuggestionAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();
        var readManager = CreateReadManager("stranger");

        var result = await readManager.GetMemorySuggestionAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task ConfirmNoPersonasAsync_ShouldFail_WhenPhotoNotFound()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.ConfirmNoPersonasAsync(new PhotoId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error.Message);
    }

    [Fact]
    public async Task ConfirmNoPersonasAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);
        var manager = CreateManager("stranger");

        var result = await manager.ConfirmNoPersonasAsync(photoId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task GetBatchPhotosAsync_ShouldReturnOnlyThatBatchsPhotos()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var batchId = Guid.NewGuid();
        var otherBatchId = Guid.NewGuid();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId, uploadBatchId: batchId);
        await _fixture.AddPhotoAsync(baulId, chapterId, uploadBatchId: otherBatchId);

        var readManager = CreateReadManager(CustodioId);
        var result = await readManager.GetBatchPhotosAsync(baulId, batchId);

        Assert.True(result.IsSuccess);
        var photo = Assert.Single(result.Value);
        Assert.Equal(photoId.ToString(), photo.Id);
    }

    [Fact]
    public async Task GetBatchPhotosAsync_ShouldFail_WhenBatchDoesNotExist()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var readManager = CreateReadManager(CustodioId);

        var result = await readManager.GetBatchPhotosAsync(baulId, Guid.NewGuid());

        Assert.True(result.IsFailure);
    }

    // Direct upload into "Mis fotos" (Slice 3, docs/.backlog issue #62) — no chapter/baúl in
    // the loop at all.
    [Fact]
    public async Task UploadToMyPhotosAsync_CreatesAPhotoAssetAndUserPhotoAsset_ButNoPhoto()
    {
        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream([1, 2, 3]);

        var result = await manager.UploadToMyPhotosAsync(content, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value.Baules);
        var assetId = new PhotoAssetId(Guid.Parse(result.Value.Id));
        Assert.NotNull(await _fixture.Photos.GetAssetByIdAsync(assetId));
        Assert.True(await _fixture.Photos.HasUserPhotoAssetAsync(new UserId(CustodioId), assetId));
        // No Photo was ever created for this asset.
        Assert.Null(await _fixture.Photos.GetByIdAsync(new PhotoId(assetId.Value)));
    }

    [Fact]
    public async Task UploadToMyPhotosAsync_AppearsInMisFotos_AndInSinCompartir()
    {
        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream([4, 5, 6]);
        var uploadResult = await manager.UploadToMyPhotosAsync(content, new ClientUploadId(Guid.NewGuid()));

        var myPhotos = await CreateMyPhotosReadManager(CustodioId, _photoStorage).GetMyPhotosAsync(0, 60);
        var unshared = await CreateMyPhotosReadManager(CustodioId, _photoStorage).GetMyPhotosAsync(0, 60, unsharedOnly: true);

        Assert.Contains(myPhotos.Value.Items, i => i.Id == uploadResult.Value.Id);
        Assert.Contains(unshared.Value.Items, i => i.Id == uploadResult.Value.Id);
    }

    [Fact]
    public async Task UploadToMyPhotosAsync_ReusesTheAsset_WhenTheExactSameBytesAreAlreadyInMisFotos()
    {
        var manager = CreateManager(CustodioId);
        var bytes = new byte[] { 7, 7, 7 };
        var first = await manager.UploadToMyPhotosAsync(new MemoryStream(bytes), new ClientUploadId(Guid.NewGuid()));

        var second = await manager.UploadToMyPhotosAsync(new MemoryStream(bytes), new ClientUploadId(Guid.NewGuid()));

        Assert.True(second.IsSuccess);
        Assert.Equal(first.Value.Id, second.Value.Id);
        // Only one PhotoAsset, only one UserPhotoAsset relation, only one stored blob.
        Assert.Single(_photoStorage.SavedKeys);
        Assert.Single(await _fixture.Photos.GetByContributorAsync(new UserId(CustodioId)));
    }

    [Fact]
    public async Task UploadToMyPhotosAsync_ReusesTheCanonicalAsset_WhenAnotherUserAlreadyHasIt_WithoutLeaking()
    {
        var bytes = new byte[] { 8, 8, 8 };
        const string jaimeId = "jaime";
        var jaimeManager = new PhotoManager(
            NullLogger<PhotoManager>.Instance, _fixture.Photos, _fixture.Chapters,
            new StaticCurrentUserProvider(jaimeId), new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            CreatePhotoLifecycleService(), CreatePhotoDtoProjector(), CreatePhotoUploadWorkflow(),
            CreateMyPhotosReadManager(jaimeId),
            new StaticIdGenerator(Guid.NewGuid()), _fixture.Clock, new FakeUnitOfWork());
        var jaimeUpload = await jaimeManager.UploadToMyPhotosAsync(new MemoryStream(bytes), new ClientUploadId(Guid.NewGuid()));

        var pedroManager = CreateManager(CustodioId);
        var pedroUpload = await pedroManager.UploadToMyPhotosAsync(new MemoryStream(bytes), new ClientUploadId(Guid.NewGuid()));

        Assert.True(pedroUpload.IsSuccess);
        Assert.Equal(jaimeUpload.Value.Id, pedroUpload.Value.Id, ignoreCase: true);
        Assert.Single(_photoStorage.SavedKeys);
        Assert.True(await _fixture.Photos.HasUserPhotoAssetAsync(
            new UserId(CustodioId), new PhotoAssetId(Guid.Parse(pedroUpload.Value.Id))));
        Assert.DoesNotContain("jaime", pedroUpload.Value.Id, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UploadToMyPhotosAsync_OfAnAssetAlreadyInABaul_DoesNotCreateANewPhoto_AndIsNotUnshared()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var bytes = new byte[] { 9, 9, 9 };
        var manager = CreateManager(CustodioId);
        using var uploadContent = new MemoryStream(bytes);
        var baulUpload = await manager.UploadAsync(chapterId, uploadContent, new ClientUploadId(Guid.NewGuid()));
        Assert.True(baulUpload.IsSuccess);

        var myFotosUpload = await manager.UploadToMyPhotosAsync(new MemoryStream(bytes), new ClientUploadId(Guid.NewGuid()));

        Assert.True(myFotosUpload.IsSuccess);
        var appearance = Assert.Single(myFotosUpload.Value.Baules);
        Assert.Equal(baulId.ToString(), appearance.BaulId);
        // Still exactly one Photo in the chapter — the Mis fotos upload didn't create a second one.
        Assert.Single(await _fixture.Photos.GetByChapterIdAsync(chapterId));

        var unshared = await CreateMyPhotosReadManager(CustodioId, _photoStorage).GetMyPhotosAsync(0, 60, unsharedOnly: true);
        Assert.DoesNotContain(unshared.Value.Items, i => i.Id == myFotosUpload.Value.Id);
    }

    // ─── "Quitar de Mis fotos" / reactivation (Slice 5, docs/.backlog issue #62) ──────────────

    [Fact]
    public async Task RemoveFromMyPhotosAsync_SoftDeletesOnlyTheCallersOwnRelation()
    {
        const string jaimeId = "jaime";
        var manager = CreateManager(CustodioId);
        var upload = await manager.UploadToMyPhotosAsync(new MemoryStream([1, 1, 1]), new ClientUploadId(Guid.NewGuid()));
        var assetId = new PhotoAssetId(Guid.Parse(upload.Value.Id));
        await _fixture.Photos.EnsureUserPhotoAssetActiveAsync(new UserId(jaimeId), assetId, _fixture.Clock.UtcNow());

        var result = await manager.RemoveFromMyPhotosAsync(assetId);

        Assert.True(result.IsSuccess);
        Assert.False(await _fixture.Photos.HasUserPhotoAssetAsync(new UserId(CustodioId), assetId));
        Assert.True(await _fixture.Photos.HasUserPhotoAssetAsync(new UserId(jaimeId), assetId),
            "another user's relation to the same asset must be untouched");
        Assert.NotNull(await _fixture.Photos.GetAssetByIdAsync(assetId));
    }

    [Fact]
    public async Task RemoveFromMyPhotosAsync_RemovesTheAssetFromMisFotosQueries()
    {
        var manager = CreateManager(CustodioId);
        var upload = await manager.UploadToMyPhotosAsync(new MemoryStream([2, 2, 2]), new ClientUploadId(Guid.NewGuid()));
        var assetId = new PhotoAssetId(Guid.Parse(upload.Value.Id));

        await manager.RemoveFromMyPhotosAsync(assetId);

        var myPhotos = await CreateMyPhotosReadManager(CustodioId, _photoStorage).GetMyPhotosAsync(0, 60);
        Assert.DoesNotContain(myPhotos.Value.Items, i => i.Id == upload.Value.Id);
    }

    [Fact]
    public async Task RemoveFromMyPhotosAsync_IsIdempotent_ForAnUnknownOrAlreadyRemovedAsset()
    {
        var manager = CreateManager(CustodioId);
        var assetId = new PhotoAssetId(Guid.NewGuid());

        var result = await manager.RemoveFromMyPhotosAsync(assetId);

        Assert.True(result.IsSuccess, "removing an asset never in Mis fotos must never fail or leak that fact");
    }

    [Fact]
    public async Task RemoveFromMyPhotosBatchAsync_OnlyAffectsTheSelectedAssets_AndTheCurrentUser()
    {
        const string jaimeId = "jaime";
        var manager = CreateManager(CustodioId);
        var uploadA = await manager.UploadToMyPhotosAsync(new MemoryStream([3, 3, 3]), new ClientUploadId(Guid.NewGuid()));
        var uploadB = await manager.UploadToMyPhotosAsync(new MemoryStream([4, 4, 4]), new ClientUploadId(Guid.NewGuid()));
        var uploadC = await manager.UploadToMyPhotosAsync(new MemoryStream([5, 5, 5]), new ClientUploadId(Guid.NewGuid()));
        var assetA = new PhotoAssetId(Guid.Parse(uploadA.Value.Id));
        var assetB = new PhotoAssetId(Guid.Parse(uploadB.Value.Id));
        var assetC = new PhotoAssetId(Guid.Parse(uploadC.Value.Id));
        await _fixture.Photos.EnsureUserPhotoAssetActiveAsync(new UserId(jaimeId), assetA, _fixture.Clock.UtcNow());

        var result = await manager.RemoveFromMyPhotosBatchAsync([assetA, assetB]);

        Assert.True(result.IsSuccess);
        Assert.False(await _fixture.Photos.HasUserPhotoAssetAsync(new UserId(CustodioId), assetA));
        Assert.False(await _fixture.Photos.HasUserPhotoAssetAsync(new UserId(CustodioId), assetB));
        Assert.True(await _fixture.Photos.HasUserPhotoAssetAsync(new UserId(CustodioId), assetC),
            "an asset not in the batch must remain active");
        Assert.True(await _fixture.Photos.HasUserPhotoAssetAsync(new UserId(jaimeId), assetA),
            "another user's relation to a batch-selected asset must be untouched");
    }

    [Fact]
    public async Task SaveToMyPhotosAsync_CreatesTheRelation_WhenItNeverExisted()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId, uploadedBy: "owner");
        var manager = CreateManager(CustodioId);

        var result = await manager.SaveToMyPhotosAsync(photoId);

        Assert.True(result.IsSuccess);
        Assert.True(await _fixture.Photos.HasUserPhotoAssetAsync(new UserId(CustodioId), new PhotoAssetId(photoId.Value)));
        var myPhotos = await CreateMyPhotosReadManager(CustodioId, _photoStorage).GetMyPhotosAsync(0, 60);
        Assert.Contains(myPhotos.Value.Items, i => i.Id == result.Value.Id);
    }

    [Fact]
    public async Task SaveToMyPhotosAsync_ReactivatesTheSameRelation_WhenPreviouslyRemoved()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId, uploadedBy: CustodioId);
        var assetId = new PhotoAssetId(photoId.Value);
        var manager = CreateManager(CustodioId);
        await manager.RemoveFromMyPhotosAsync(assetId);
        Assert.False(await _fixture.Photos.HasUserPhotoAssetAsync(new UserId(CustodioId), assetId));

        var result = await manager.SaveToMyPhotosAsync(photoId);

        Assert.True(result.IsSuccess);
        Assert.True(await _fixture.Photos.HasUserPhotoAssetAsync(new UserId(CustodioId), assetId));
        var relations = await _fixture.Photos.GetUserPhotoAssetsByAssetIdsAsync([assetId]);
        Assert.Single(relations, r => r.UserId == new UserId(CustodioId));
    }

    [Fact]
    public async Task SaveToMyPhotosAsync_IsANoOp_WhenAlreadyActive()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId, uploadedBy: CustodioId);
        var manager = CreateManager(CustodioId);

        var first = await manager.SaveToMyPhotosAsync(photoId);
        var second = await manager.SaveToMyPhotosAsync(photoId);

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);
        var relations = await _fixture.Photos.GetUserPhotoAssetsByAssetIdsAsync([new PhotoAssetId(photoId.Value)]);
        Assert.Single(relations);
    }

    [Fact]
    public async Task SaveToMyPhotosAsync_NeverCreatesAPhotoAsset_OrAltersTheSourcePhoto()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId, uploadedBy: "owner");
        var beforeSourcePhoto = await _fixture.Photos.GetByIdAsync(photoId);
        var manager = CreateManager(CustodioId);

        await manager.SaveToMyPhotosAsync(photoId);

        var afterSourcePhoto = await _fixture.Photos.GetByIdAsync(photoId);
        Assert.Equal(beforeSourcePhoto!.PhotoAssetId, afterSourcePhoto!.PhotoAssetId);
        Assert.Equal(beforeSourcePhoto.UploadedBy, afterSourcePhoto.UploadedBy);
        // Only the one PhotoAsset the upload already created — none minted by saving it.
        Assert.Single(await _fixture.Photos.GetAllAssetsAsync());
    }

    [Fact]
    public async Task SaveToMyPhotosAsync_DeniesAccess_ForAUserWithNoRelationToTheSourceBaul()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId, uploadedBy: "owner");
        var manager = CreateManager("stranger");

        var result = await manager.SaveToMyPhotosAsync(photoId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task SaveToMyPhotosBatchAsync_DeduplicatesToOneRelation_WhenSeveralSelectedPhotosShareAnAsset()
    {
        var sourceBaulId = await _fixture.CreateBaulAsync("Origen");
        var targetBaulId = await _fixture.CreateBaulAsync("Destino");
        var sourcePhotoId = await _fixture.AddPhotoAsync(sourceBaulId, uploadedBy: CustodioId);
        var assetId = new PhotoAssetId(sourcePhotoId.Value);
        var manager = CreateManager(CustodioId);
        // Two different Photo rows in different baúles, same underlying PhotoAsset — mirrors a
        // multi-selection where the same asset appears twice (Slice 2's cross-baúl reuse).
        await manager.AddAssetToBaulAsync(assetId, targetBaulId);
        var otherPhoto = await _fixture.Photos.GetActiveByAssetIdAsync(targetBaulId, assetId);

        var result = await manager.SaveToMyPhotosBatchAsync([sourcePhotoId, otherPhoto!.Id]);

        Assert.True(result.IsSuccess);
        // Both selected photos are processed successfully (each references the same asset) —
        // the dedup guarantee is that only one UserPhotoAsset relation ever results, not that
        // the second photo is skipped.
        Assert.Equal(2, result.Value.Count());
        var relations = await _fixture.Photos.GetUserPhotoAssetsByAssetIdsAsync([assetId]);
        Assert.Single(relations, r => r.UserId == new UserId(CustodioId));
    }

    [Fact]
    public async Task SaveToMyPhotosBatchAsync_SkipsUnauthorizedPhotos_WithoutFailingTheRest()
    {
        var (ownBaulId, ownChapterId) = await _fixture.CreateBaulWithChapterAsync();
        var (otherBaulId, otherChapterId) = await _fixture.CreateBaulWithChapterAsync(custodioId: "someone-else");
        var ownPhotoId = await _fixture.AddPhotoAsync(ownBaulId, ownChapterId, uploadedBy: CustodioId);
        var forbiddenPhotoId = await _fixture.AddPhotoAsync(otherBaulId, otherChapterId, uploadedBy: "someone-else");
        var manager = CreateManager(CustodioId);

        var result = await manager.SaveToMyPhotosBatchAsync([ownPhotoId, forbiddenPhotoId]);

        Assert.True(result.IsSuccess);
        var saved = Assert.Single(result.Value);
        Assert.Equal(ownPhotoId.Value.ToString(), saved.Id);
    }

    // ─── Bulk "Añadir a un baúl" from Mis fotos (Slice 5, docs/.backlog issue #62) ────────────

    [Fact]
    public async Task AddAssetsToBaulBatchAsync_AddsEachAsset_AndTreatsAlreadyPresentAssetsAsSuccess()
    {
        var targetBaulId = await _fixture.CreateBaulAsync("Destino");
        var manager = CreateManager(CustodioId);
        var uploadA = await manager.UploadToMyPhotosAsync(new MemoryStream([6, 6, 6]), new ClientUploadId(Guid.NewGuid()));
        var uploadB = await manager.UploadToMyPhotosAsync(new MemoryStream([7, 7, 7]), new ClientUploadId(Guid.NewGuid()));
        var assetA = new PhotoAssetId(Guid.Parse(uploadA.Value.Id));
        var assetB = new PhotoAssetId(Guid.Parse(uploadB.Value.Id));
        // assetA already active in the target baúl before the batch call — must be a no-op success.
        await manager.AddAssetToBaulAsync(assetA, targetBaulId);

        var result = await manager.AddAssetsToBaulBatchAsync([assetA, assetB], targetBaulId);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Count());
        Assert.Equal(2, (await _fixture.Photos.GetActiveByBaulIdAsync(targetBaulId)).Count());
    }

    // Issue #81: several assets added together in one multi-select must share a single
    // UploadBatchId, so the target baúl's feed groups them into one "photo batch" card instead
    // of one per asset — see Photo.CreateFromExistingAsset's doc comment.
    [Fact]
    public async Task AddAssetsToBaulBatchAsync_GivesEveryAddedPhoto_TheSameUploadBatchId()
    {
        var targetBaulId = await _fixture.CreateBaulAsync("Destino");
        var manager = CreateManager(CustodioId);
        var uploadA = await manager.UploadToMyPhotosAsync(new MemoryStream([9, 9, 9]), new ClientUploadId(Guid.NewGuid()));
        var uploadB = await manager.UploadToMyPhotosAsync(new MemoryStream([10, 10, 10]), new ClientUploadId(Guid.NewGuid()));
        var assetA = new PhotoAssetId(Guid.Parse(uploadA.Value.Id));
        var assetB = new PhotoAssetId(Guid.Parse(uploadB.Value.Id));

        var result = await manager.AddAssetsToBaulBatchAsync([assetA, assetB], targetBaulId);

        Assert.True(result.IsSuccess);
        var photos = await _fixture.Photos.GetActiveByBaulIdAsync(targetBaulId);
        Assert.Equal(2, photos.Count());
        Assert.All(photos, p => Assert.NotNull(p.UploadBatchId));
        Assert.Single(photos.Select(p => p.UploadBatchId).Distinct());
    }

    [Fact]
    public async Task AddAssetsToBaulBatchAsync_SkipsAssetsTheCallerDoesNotOwnInMisFotos()
    {
        var targetBaulId = await _fixture.CreateBaulAsync("Destino");
        var manager = CreateManager(CustodioId);
        var ownUpload = await manager.UploadToMyPhotosAsync(new MemoryStream([8, 8, 8]), new ClientUploadId(Guid.NewGuid()));
        var ownAssetId = new PhotoAssetId(Guid.Parse(ownUpload.Value.Id));
        var foreignAssetId = new PhotoAssetId(Guid.NewGuid());

        var result = await manager.AddAssetsToBaulBatchAsync([ownAssetId, foreignAssetId], targetBaulId);

        Assert.True(result.IsSuccess);
        var appearance = Assert.Single(result.Value);
        Assert.Equal(targetBaulId.ToString(), appearance.BaulId);
    }

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<(LogLevel Level, string Message)> Entries { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter) =>
            Entries.Add((logLevel, formatter(state, exception)));
    }
}
