using ElBaul.Application.Bauls;
using ElBaul.Application.Photos;
using ElBaul.InputPorts.Feed;
using ElBaul.InputPorts.Photos;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;

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
        new(photoRepository ?? _fixture.Photos, _fixture.Chapters, _fixture.Baules, _fixture.Clock);

    private PhotoDtoProjector CreatePhotoDtoProjector(IPhotoStorage? photoStorage = null) =>
        new(photoStorage ?? _photoStorage, _fixture.Recuerdos);

    private PhotoFileService CreatePhotoFileService(IPhotoStorage? photoStorage = null) =>
        new(NullLogger<PhotoFileService>.Instance, photoStorage ?? _photoStorage, new StaticIdGenerator(Guid.NewGuid()), _photoDateExtractor, new FakePhotoImageNormalizer());

    private PhotoUploadWorkflow CreatePhotoUploadWorkflow(IPhotoRepository? photoRepository = null, IPhotoStorage? photoStorage = null, Guid? nextId = null) =>
        new(NullLogger<PhotoUploadWorkflow>.Instance, photoRepository ?? _fixture.Photos, CreatePhotoFileService(photoStorage),
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), _fixture.Clock, new FakeUnitOfWork());

    private IPhotoListReadModel CreatePhotoListReadModel() =>
        new InMemoryPhotoListReadModel(_fixture.Photos, _fixture.Recuerdos, _fixture.PhotoPersonaTags);

    private PhotoManager CreateManager(string currentUserId, Guid? nextId = null, ILogger<PhotoManager>? logger = null) =>
        new(logger ?? NullLogger<PhotoManager>.Instance, _fixture.Photos, CreatePhotoListReadModel(), _fixture.Chapters, _fixture.Baules,
            new StaticCurrentUserProvider(currentUserId), new BaulAccessService(_fixture.Baules, NullLogger<BaulAccessService>.Instance),
            _fixture.PhotoPersonaTags, CreatePhotoLifecycleService(), CreatePhotoDtoProjector(), CreatePhotoFileService(), CreatePhotoUploadWorkflow(nextId: nextId),
            new FakeUnitOfWork());

    // Persona-tagging now lives on PhotoPersonaTagManager — GetByPersonaIdAsync stays here
    // (it's a photo listing method), but tests need to tag photos first to exercise it.
    private PhotoPersonaTagManager CreateTagManager(string currentUserId) =>
        new(NullLogger<PhotoPersonaTagManager>.Instance, _fixture.Photos, _fixture.Baules, _photoStorage, _fixture.Clock,
            new StaticCurrentUserProvider(currentUserId), new BaulAccessService(_fixture.Baules, NullLogger<BaulAccessService>.Instance),
            _fixture.PhotoPersonaTags, new FakeUnitOfWork());

    [Fact]
    public async Task UploadAsync_ShouldSaveFile_AndIncrementChapterPhotoCount()
    {
        var (_, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()));

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
            chapterId, content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()), uploadBatchId);

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
        var result = await manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()));

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
        var result = await manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()));

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
            NullLogger<PhotoManager>.Instance, _fixture.Photos, CreatePhotoListReadModel(), _fixture.Chapters, _fixture.Baules,
            new StaticCurrentUserProvider(CustodioId), new BaulAccessService(_fixture.Baules, NullLogger<BaulAccessService>.Instance),
            _fixture.PhotoPersonaTags, CreatePhotoLifecycleService(), CreatePhotoDtoProjector(failingStorage), CreatePhotoFileService(failingStorage), CreatePhotoUploadWorkflow(photoStorage: failingStorage),
            new FakeUnitOfWork());

        using var content = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid())));

        Assert.Empty(await _fixture.Photos.GetByChapterIdAsync(chapterId));
    }

    [Fact]
    public async Task UploadAsync_ShouldDeleteOrphanedStorageObject_WhenPersistingMetadataFails()
    {
        var (_, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var failingRepository = Substitute.For<IPhotoRepository>();
        failingRepository.CreateAsync(Arg.Any<Photo>())
            .Returns<Task>(_ => throw new InvalidOperationException("database unavailable"));

        var manager = new PhotoManager(
            NullLogger<PhotoManager>.Instance, failingRepository, CreatePhotoListReadModel(), _fixture.Chapters, _fixture.Baules,
            new StaticCurrentUserProvider(CustodioId), new BaulAccessService(_fixture.Baules, NullLogger<BaulAccessService>.Instance),
            _fixture.PhotoPersonaTags, CreatePhotoLifecycleService(failingRepository), CreatePhotoDtoProjector(), CreatePhotoFileService(), CreatePhotoUploadWorkflow(failingRepository),
            new FakeUnitOfWork());

        using var content = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid())));

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
        failingRepository.CreateAsync(Arg.Any<Photo>())
            .Returns<Task>(_ => throw new InvalidOperationException("database unavailable"));

        var manager = new PhotoManager(
            NullLogger<PhotoManager>.Instance, failingRepository, CreatePhotoListReadModel(), _fixture.Chapters, _fixture.Baules,
            new StaticCurrentUserProvider(CustodioId), new BaulAccessService(_fixture.Baules, NullLogger<BaulAccessService>.Instance),
            _fixture.PhotoPersonaTags, CreatePhotoLifecycleService(failingRepository), CreatePhotoDtoProjector(), CreatePhotoFileService(), CreatePhotoUploadWorkflow(failingRepository),
            new FakeUnitOfWork());

        using var content = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => manager.UploadToBaulAsync(baulId, content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid())));

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
        var result = await manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, new ClientUploadId(clientUploadId));

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
        var result = await manager.UploadToBaulAsync(baulId, content, "photo.jpg", "image/jpeg", null, new ClientUploadId(clientUploadId));

        Assert.True(result.IsSuccess);
        Assert.Equal(existingPhotoId.ToString(), result.Value.Id);
        Assert.Empty(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task GetByChapterIdAsync_ShouldFail_WhenChapterDoesNotExist()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.GetByChapterIdAsync(new ChapterId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal("Chapter not found", result.Error.Message);
    }

    [Fact]
    public async Task GetByChapterIdAsync_ShouldLogWarning_WhenChapterDoesNotExist()
    {
        var logger = new CapturingLogger<PhotoManager>();
        var chapterId = new ChapterId(Guid.NewGuid());
        var manager = CreateManager(CustodioId, logger: logger);

        await manager.GetByChapterIdAsync(chapterId);

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

        var manager = CreateManager(CustodioId);
        var result = await manager.GetByChapterIdAsync(chapterId);

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
        await _fixture.Chapters.UpdateAsync(sourceChapter! with { PhotoCount = 1 });

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

    [Fact]
    public async Task DeleteAsync_ShouldHidePhotoFromChapterListing()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);

        var manager = CreateManager(CustodioId);
        await manager.DeleteAsync(photoId, "Ya no aplica");

        var result = await manager.GetByChapterIdAsync(chapterId);
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
    public async Task UploadToBaulAsync_ShouldSaveFile_WithNullChapterId()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadToBaulAsync(baulId, content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()));

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

        var manager = CreateManager(CustodioId);
        var result = await manager.GetLooseByBaulIdAsync(baulId);

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

        var manager = CreateManager(CustodioId);
        var result = await manager.GetPageAsync(baulId, null, 0, 10);

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

        var manager = CreateManager(CustodioId);
        var result = await manager.GetPageAsync(baulId, sourceChapterId, 0, 10);

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

        var manager = CreateManager(CustodioId);
        var result = await manager.GetPageAsync(baulId, null, 0, 2);

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

        var manager = CreateManager(CustodioId);
        var result = await manager.GetPageAsync(baulId, null, 0, 10);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Items.Count);
        Assert.False(result.Value.HasMore);
    }

    [Fact]
    public async Task GetPageAsync_ShouldExcludeDeletedPhotos()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);

        var manager = CreateManager(CustodioId);
        await manager.DeleteAsync(photoId, "reason");
        var result = await manager.GetPageAsync(baulId, null, 0, 10);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value.Items);
    }

    [Fact]
    public async Task GetPageAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();
        var manager = CreateManager("stranger");
        var result = await manager.GetPageAsync(baulId, null, 0, 10);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task GetPageAsync_ShouldFail_WhenChapterDoesNotBelongToBaul()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();
        var (_, otherChapterId) = await _fixture.CreateBaulWithChapterAsync();

        var manager = CreateManager(CustodioId);
        var result = await manager.GetPageAsync(baulId, otherChapterId, 0, 10);

        Assert.True(result.IsFailure);
        Assert.Equal("Chapter not found", result.Error.Message);
    }

    [Fact]
    public async Task UploadAsync_ShouldLeavePhotoUndated_WhenNoDateGivenAndNoExifFound()
    {
        var (_, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.DateYear);
        Assert.Null(result.Value.DateMonth);
        Assert.Null(result.Value.DateDay);
    }

    [Fact]
    public async Task UploadAsync_ShouldUseExifDate_WhenNoExplicitDateGiven()
    {
        var (_, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        _photoDateExtractor.NextResult = (2019, 8, 3);
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Equal(2019, result.Value.DateYear);
        Assert.Equal(8, result.Value.DateMonth);
        Assert.Equal(3, result.Value.DateDay);
    }

    [Fact]
    public async Task UploadAsync_ShouldPreferExplicitDate_OverExif()
    {
        var (_, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        _photoDateExtractor.NextResult = (2019, 8, 3);
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(
            chapterId, content, "photo.jpg", "image/jpeg", PhotoDates.Of(2021, 1, 2), new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Equal(2021, result.Value.DateYear);
        Assert.Equal(1, result.Value.DateMonth);
        Assert.Equal(2, result.Value.DateDay);
    }

    [Fact]
    public async Task UploadAsync_ShouldAcceptPartialExplicitDate_YearOnly()
    {
        var (_, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(
            chapterId, content, "photo.jpg", "image/jpeg", PhotoDates.Of(2020), new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Equal(2020, result.Value.DateYear);
        Assert.Null(result.Value.DateMonth);
        Assert.Null(result.Value.DateDay);
    }

    [Fact]
    public async Task UploadAsync_ShouldAcceptPartialExplicitDate_YearAndMonth()
    {
        var (_, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(
            chapterId, content, "photo.jpg", "image/jpeg", PhotoDates.Of(2020, 6), new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Equal(2020, result.Value.DateYear);
        Assert.Equal(6, result.Value.DateMonth);
        Assert.Null(result.Value.DateDay);
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

        var manager = CreateManager(CustodioId);
        var result = await manager.DownloadAsync(photoId);

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
        var manager = CreateManager(CustodioId);
        var result = await manager.DownloadAsync(new PhotoId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error.Message);
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
    public async Task GetByPersonaIdAsync_ShouldReturnTaggedPhotos_OrderedChronologically()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuelo Antonio");

        var newerPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "newer", PhotoDates.Of(2020, 5, 10));
        var olderPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "older", PhotoDates.Of(1998, 6, 15));
        var undatedPhotoId = await _fixture.AddPhotoAsync(baulId, chapterId, "undated");

        var manager = CreateManager(CustodioId);
        var tagManager = CreateTagManager(CustodioId);
        await tagManager.SetTaggedPersonasAsync(newerPhotoId, [personaId]);
        await tagManager.SetTaggedPersonasAsync(olderPhotoId, [personaId]);
        await tagManager.SetTaggedPersonasAsync(undatedPhotoId, [personaId]);

        var result = await manager.GetByPersonaIdAsync(baulId, personaId);

        Assert.True(result.IsSuccess);
        Assert.Equal([olderPhotoId.ToString(), newerPhotoId.ToString(), undatedPhotoId.ToString()], result.Value.Select(p => p.Id));
    }

    [Fact]
    public async Task GetByPersonaIdAsync_ShouldExcludeSoftDeletedPhotos()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuelo Antonio");

        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);

        var manager = CreateManager(CustodioId);
        await CreateTagManager(CustodioId).SetTaggedPersonasAsync(photoId, [personaId]);
        await manager.DeleteAsync(photoId, "duplicada");

        var result = await manager.GetByPersonaIdAsync(baulId, personaId);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value);
    }

    [Fact]
    public async Task GetByPersonaIdAsync_ShouldFail_WhenPersonaBelongsToAnotherBaul()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();
        var otherBaulId = await _fixture.CreateBaulAsync("Otro", "someone-else");
        var foreignPersonaId = await _fixture.AddPendingPersonaAsync(otherBaulId, "Ajeno");

        var manager = CreateManager(CustodioId);
        var result = await manager.GetByPersonaIdAsync(baulId, foreignPersonaId);

        Assert.True(result.IsFailure);
        Assert.Equal("Persona not found", result.Error.Message);
    }

    [Fact]
    public async Task GetUntaggedSuggestionAsync_ShouldReturnNull_WhenBaulHasNoPhotos()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        var result = await manager.GetUntaggedSuggestionAsync(baulId);

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

        var manager = CreateManager(CustodioId);
        var result = await manager.GetUntaggedSuggestionAsync(baulId);

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

        var manager = CreateManager(CustodioId);
        var result = await manager.GetUntaggedSuggestionAsync(baulId);

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
            var photo = Photo.Create(
                new PhotoId(Guid.NewGuid()), chapterId, baulId, $"key-{i}", null, new UserId(CustodioId), now.AddDays(-i));
            await _fixture.Photos.CreateAsync(photo);
            photoIds.Add(photo.Id);
        }

        var manager = CreateManager(CustodioId);
        var seen = new HashSet<string>();
        for (var i = 0; i < 30; i++)
        {
            var result = await manager.GetUntaggedSuggestionAsync(baulId);
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
        var manager = CreateManager(CustodioId);
        await manager.DeleteAsync(photoId, "reason");

        var result = await manager.GetUntaggedSuggestionAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value);
    }

    [Fact]
    public async Task GetUntaggedSuggestionAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();
        var manager = CreateManager("stranger");

        var result = await manager.GetUntaggedSuggestionAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task GetUntaggedSuggestionAsync_ShouldIgnorePhotosConfirmedAsHavingNoPersonas()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);

        var manager = CreateManager(CustodioId);
        var confirmResult = await manager.ConfirmNoPersonasAsync(photoId);
        Assert.True(confirmResult.IsSuccess);

        var result = await manager.GetUntaggedSuggestionAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value);
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
