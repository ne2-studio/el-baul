using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace ElBaul.Tests;

public class PhotoManagerTests
{
    private const string CustodioId = "custodio-1";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly InMemoryPhotoPersonaTagRepository _photoPersonaTagRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();
    private readonly FakePhotoDateExtractor _photoDateExtractor = new();

    private PhotoSoftDeleteService CreatePhotoSoftDeleteService(IPhotoRepository? photoRepository = null) =>
        new(photoRepository ?? _photoRepository, _chapterRepository, _baulRepository, _clock);

    private PhotoDtoProjector CreatePhotoDtoProjector(IPhotoStorage? photoStorage = null) =>
        new(photoStorage ?? _photoStorage, _recuerdoRepository);

    private PhotoFileService CreatePhotoFileService(IPhotoStorage? photoStorage = null) =>
        new(NullLogger<PhotoFileService>.Instance, photoStorage ?? _photoStorage, new StaticIdGenerator(Guid.NewGuid()), _photoDateExtractor, new FakePhotoImageNormalizer());

    private PhotoManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(NullLogger<PhotoManager>.Instance, _photoRepository, _chapterRepository, _baulRepository,
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), _clock,
            new StaticCurrentUserProvider(currentUserId), new BaulAccessService(_baulRepository, NullLogger<BaulAccessService>.Instance),
            _photoPersonaTagRepository, CreatePhotoSoftDeleteService(), CreatePhotoDtoProjector(), CreatePhotoFileService());

    // Persona-tagging now lives on PhotoPersonaTagManager — GetByPersonaIdAsync stays here
    // (it's a photo listing method), but tests need to tag photos first to exercise it.
    private PhotoPersonaTagManager CreateTagManager(string currentUserId) =>
        new(NullLogger<PhotoPersonaTagManager>.Instance, _photoRepository, _baulRepository, _photoStorage, _clock,
            new StaticCurrentUserProvider(currentUserId), new BaulAccessService(_baulRepository, NullLogger<BaulAccessService>.Instance),
            _photoPersonaTagRepository);

    private async Task<(Guid baulId, Guid chapterId)> SeedBaulWithChapterAsync()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), CustodioId, "Custodio", BaulRole.Custodio, _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));
        return (baulId, chapterId);
    }

    private async Task<(Guid baulId, Guid sourceChapterId, Guid targetChapterId)> SeedBaulWithTwoChaptersAsync()
    {
        var (baulId, sourceChapterId) = await SeedBaulWithChapterAsync();
        var targetChapterId = Guid.NewGuid();
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(targetChapterId), new BaulId(baulId), "Destino", 0, null, _clock.UtcNow(), _clock.UtcNow()));
        return (baulId, sourceChapterId, targetChapterId);
    }

    [Fact]
    public async Task UploadAsync_ShouldSaveFile_AndIncrementChapterPhotoCount()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(new ChapterId(chapterId), content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Single(_photoStorage.SavedKeys);

        var chapter = await _chapterRepository.GetByIdAsync(new ChapterId(chapterId));
        Assert.Equal(1, chapter!.PhotoCount);
    }

    [Fact]
    public async Task UploadAsync_ShouldRecordFileSizeInBytes()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3, 4, 5]);
        var result = await manager.UploadAsync(new ChapterId(chapterId), content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        var stored = await _photoRepository.GetByIdAsync(new PhotoId(Guid.Parse(result.Value.Id)));
        Assert.Equal(5, stored!.SizeBytes);
    }

    [Fact]
    public async Task UploadAsync_ShouldSetFirstPhotoAsCover()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        await manager.UploadAsync(new ChapterId(chapterId), content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()));

        var chapter = await _chapterRepository.GetByIdAsync(new ChapterId(chapterId));
        Assert.False(string.IsNullOrEmpty(chapter!.CoverPhotoKey));
    }

    [Fact]
    public async Task UploadAsync_ShouldSetBaulCover_WhenBaulHasNoCoverYet()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        await manager.UploadAsync(new ChapterId(chapterId), content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()));

        var baul = await _baulRepository.GetByIdAsync(new BaulId(baulId));
        Assert.False(string.IsNullOrEmpty(baul!.CoverPhotoKey));
    }

    [Fact]
    public async Task UploadAsync_ShouldNotOverwriteExistingBaulCover()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var existingBaul = await _baulRepository.GetByIdAsync(new BaulId(baulId));
        await _baulRepository.UpdateAsync(existingBaul! with { CoverPhotoKey = "existing-key" });

        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream([1, 2, 3]);
        await manager.UploadAsync(new ChapterId(chapterId), content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()));

        var baul = await _baulRepository.GetByIdAsync(new BaulId(baulId));
        Assert.Equal("existing-key", baul!.CoverPhotoKey);
    }

    [Fact]
    public async Task UploadAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();

        var manager = CreateManager("stranger");
        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(new ChapterId(chapterId), content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task UploadAsync_ShouldPropagateException_WhenStorageSaveFails()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();
        var failingStorage = Substitute.For<IPhotoStorage>();
        failingStorage.SaveAsync(Arg.Any<string>(), Arg.Any<Stream>(), Arg.Any<string>())
            .Returns<Task>(_ => throw new InvalidOperationException("storage unavailable"));

        var manager = new PhotoManager(
            NullLogger<PhotoManager>.Instance, _photoRepository, _chapterRepository, _baulRepository,
            new StaticIdGenerator(Guid.NewGuid()), _clock,
            new StaticCurrentUserProvider(CustodioId), new BaulAccessService(_baulRepository, NullLogger<BaulAccessService>.Instance),
            _photoPersonaTagRepository, CreatePhotoSoftDeleteService(), CreatePhotoDtoProjector(failingStorage), CreatePhotoFileService(failingStorage));

        using var content = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => manager.UploadAsync(new ChapterId(chapterId), content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid())));

        Assert.Empty(await _photoRepository.GetByChapterIdAsync(new ChapterId(chapterId)));
    }

    [Fact]
    public async Task UploadAsync_ShouldDeleteOrphanedStorageObject_WhenPersistingMetadataFails()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();
        var failingRepository = Substitute.For<IPhotoRepository>();
        failingRepository.CreateAsync(Arg.Any<Photo>())
            .Returns<Task>(_ => throw new InvalidOperationException("database unavailable"));

        var manager = new PhotoManager(
            NullLogger<PhotoManager>.Instance, failingRepository, _chapterRepository, _baulRepository,
            new StaticIdGenerator(Guid.NewGuid()), _clock,
            new StaticCurrentUserProvider(CustodioId), new BaulAccessService(_baulRepository, NullLogger<BaulAccessService>.Instance),
            _photoPersonaTagRepository, CreatePhotoSoftDeleteService(failingRepository), CreatePhotoDtoProjector(), CreatePhotoFileService());

        using var content = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => manager.UploadAsync(new ChapterId(chapterId), content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid())));

        // The file was saved to storage before the DB write failed, so the manager
        // must compensate by deleting it to avoid leaving an orphaned blob.
        Assert.Single(_photoStorage.SavedKeys);
        Assert.Equal(_photoStorage.SavedKeys, _photoStorage.DeletedKeys);
    }

    [Fact]
    public async Task UploadToBaulAsync_ShouldDeleteOrphanedStorageObject_WhenPersistingMetadataFails()
    {
        var (baulId, _) = await SeedBaulWithChapterAsync();
        var failingRepository = Substitute.For<IPhotoRepository>();
        failingRepository.CreateAsync(Arg.Any<Photo>())
            .Returns<Task>(_ => throw new InvalidOperationException("database unavailable"));

        var manager = new PhotoManager(
            NullLogger<PhotoManager>.Instance, failingRepository, _chapterRepository, _baulRepository,
            new StaticIdGenerator(Guid.NewGuid()), _clock,
            new StaticCurrentUserProvider(CustodioId), new BaulAccessService(_baulRepository, NullLogger<BaulAccessService>.Instance),
            _photoPersonaTagRepository, CreatePhotoSoftDeleteService(failingRepository), CreatePhotoDtoProjector(), CreatePhotoFileService());

        using var content = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => manager.UploadToBaulAsync(new BaulId(baulId), content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid())));

        Assert.Single(_photoStorage.SavedKeys);
        Assert.Equal(_photoStorage.SavedKeys, _photoStorage.DeletedKeys);
    }

    [Fact]
    public async Task UploadAsync_ShouldReturnExistingPhoto_WhenClientUploadIdAlreadyExists()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var clientUploadId = Guid.NewGuid();
        var existingPhoto = Photo.Create(new PhotoId(Guid.NewGuid()), new ChapterId(chapterId), new BaulId(baulId), "already-uploaded-key", null, CustodioId, _clock.UtcNow(), clientUploadId);
        await _photoRepository.CreateAsync(existingPhoto);

        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(new ChapterId(chapterId), content, "photo.jpg", "image/jpeg", null, new ClientUploadId(clientUploadId));

        Assert.True(result.IsSuccess);
        Assert.Equal(existingPhoto.Id.ToString(), result.Value.Id);
        // No new upload should have happened: retrying with a known clientUploadId is a no-op.
        Assert.Empty(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task UploadToBaulAsync_ShouldReturnExistingPhoto_WhenClientUploadIdAlreadyExists()
    {
        var (baulId, _) = await SeedBaulWithChapterAsync();
        var clientUploadId = Guid.NewGuid();
        var existingPhoto = Photo.Create(new PhotoId(Guid.NewGuid()), null, new BaulId(baulId), "already-uploaded-key", null, CustodioId, _clock.UtcNow(), clientUploadId);
        await _photoRepository.CreateAsync(existingPhoto);

        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadToBaulAsync(new BaulId(baulId), content, "photo.jpg", "image/jpeg", null, new ClientUploadId(clientUploadId));

        Assert.True(result.IsSuccess);
        Assert.Equal(existingPhoto.Id.ToString(), result.Value.Id);
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
    public async Task MoveAsync_ShouldReassignChapterId_AndUpdatePhotoCounts()
    {
        var (baulId, sourceChapterId, targetChapterId) = await SeedBaulWithTwoChaptersAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(sourceChapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));
        var sourceChapter = await _chapterRepository.GetByIdAsync(new ChapterId(sourceChapterId));
        await _chapterRepository.UpdateAsync(sourceChapter! with { PhotoCount = 1 });

        var manager = CreateManager(CustodioId);
        var result = await manager.MoveAsync(new PhotoId(photoId), new ChapterId(targetChapterId));

        Assert.True(result.IsSuccess);
        Assert.Equal(targetChapterId.ToString(), result.Value.ChapterId);

        var updatedSource = await _chapterRepository.GetByIdAsync(new ChapterId(sourceChapterId));
        var updatedTarget = await _chapterRepository.GetByIdAsync(new ChapterId(targetChapterId));
        Assert.Equal(0, updatedSource!.PhotoCount);
        Assert.Equal(1, updatedTarget!.PhotoCount);
    }

    [Fact]
    public async Task MoveAsync_ShouldClearSourceCover_WhenMovedPhotoWasTheCover()
    {
        var (baulId, sourceChapterId, targetChapterId) = await SeedBaulWithTwoChaptersAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(sourceChapterId), new BaulId(baulId), "cover-key", null, CustodioId, _clock.UtcNow()));
        var sourceChapter = await _chapterRepository.GetByIdAsync(new ChapterId(sourceChapterId));
        await _chapterRepository.UpdateAsync(sourceChapter! with { PhotoCount = 1, CoverPhotoKey = "cover-key" });

        var manager = CreateManager(CustodioId);
        await manager.MoveAsync(new PhotoId(photoId), new ChapterId(targetChapterId));

        var updatedSource = await _chapterRepository.GetByIdAsync(new ChapterId(sourceChapterId));
        Assert.Null(updatedSource!.CoverPhotoKey);
    }

    [Fact]
    public async Task MoveAsync_ShouldSetTargetCover_WhenTargetHasNoCoverYet()
    {
        var (baulId, sourceChapterId, targetChapterId) = await SeedBaulWithTwoChaptersAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(sourceChapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        await manager.MoveAsync(new PhotoId(photoId), new ChapterId(targetChapterId));

        var updatedTarget = await _chapterRepository.GetByIdAsync(new ChapterId(targetChapterId));
        Assert.Equal("key", updatedTarget!.CoverPhotoKey);
    }

    [Fact]
    public async Task MoveAsync_ShouldFail_WhenTargetChapterInDifferentBaul()
    {
        var (baulId, sourceChapterId, _) = await SeedBaulWithTwoChaptersAsync();
        var (_, otherBaulChapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(sourceChapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.MoveAsync(new PhotoId(photoId), new ChapterId(otherBaulChapterId));

        Assert.True(result.IsFailure);
        Assert.Equal("Target chapter not found", result.Error.Message);
    }

    [Fact]
    public async Task DeleteAsync_ShouldHidePhotoFromChapterListing()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        await manager.DeleteAsync(new PhotoId(photoId), "Ya no aplica");

        var result = await manager.GetByChapterIdAsync(new ChapterId(chapterId));
        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value);
    }

    [Fact]
    public async Task DeleteAsync_ShouldDenyAccess_ForColaboradorRole()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));
        const string colaboradorId = "colaborador-1";
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), colaboradorId, "Colaborador", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.DeleteAsync(new PhotoId(photoId), "reason");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);

        var photo = await _photoRepository.GetByIdAsync(new PhotoId(photoId));
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
        var (baulId, _) = await SeedBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadToBaulAsync(new BaulId(baulId), content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.ChapterId);
        Assert.Single(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task UploadToBaulAsync_ShouldSetBaulCover_WhenBaulHasNoCoverYet()
    {
        var (baulId, _) = await SeedBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        await manager.UploadToBaulAsync(new BaulId(baulId), content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()));

        var baul = await _baulRepository.GetByIdAsync(new BaulId(baulId));
        Assert.False(string.IsNullOrEmpty(baul!.CoverPhotoKey));
    }

    [Fact]
    public async Task GetLooseByBaulIdAsync_ShouldReturnOnlyChapterlessPhotos()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), new ChapterId(chapterId), new BaulId(baulId), "in-chapter-key", null, CustodioId, _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), null, new BaulId(baulId), "loose-key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetLooseByBaulIdAsync(new BaulId(baulId));

        Assert.True(result.IsSuccess);
        var photo = Assert.Single(result.Value);
        Assert.Null(photo.ChapterId);
    }

    [Fact]
    public async Task GetPageAsync_ShouldReturnBaulWidePhotos_InChronologicalOrder_WithUndatedLast()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        PhotoDate.TryCreate(2019, 6, 1, out var earlyDate, out _);
        PhotoDate.TryCreate(2020, 1, 1, out var laterDate, out _);

        var earlyPhoto = Photo.Create(new PhotoId(Guid.NewGuid()), new ChapterId(chapterId), new BaulId(baulId), "early-key", earlyDate, CustodioId, _clock.UtcNow());
        var laterPhoto = Photo.Create(new PhotoId(Guid.NewGuid()), null, new BaulId(baulId), "later-key", laterDate, CustodioId, _clock.UtcNow());
        var undatedPhoto = Photo.Create(new PhotoId(Guid.NewGuid()), null, new BaulId(baulId), "undated-key", null, CustodioId, _clock.UtcNow());

        // Created out of chronological order to prove the manager sorts, rather than
        // happening to preserve insertion order.
        await _photoRepository.CreateAsync(laterPhoto);
        await _photoRepository.CreateAsync(undatedPhoto);
        await _photoRepository.CreateAsync(earlyPhoto);

        var manager = CreateManager(CustodioId);
        var result = await manager.GetPageAsync(new BaulId(baulId), null, 0, 10);

        Assert.True(result.IsSuccess);
        Assert.Equal(
            new[] { earlyPhoto.Id.ToString(), laterPhoto.Id.ToString(), undatedPhoto.Id.ToString() },
            result.Value.Items.Select(p => p.Id).ToList());
        Assert.False(result.Value.HasMore);
    }

    [Fact]
    public async Task GetPageAsync_ShouldReturnOnlyThatChaptersPhotos_WhenChapterIdGiven()
    {
        var (baulId, sourceChapterId, targetChapterId) = await SeedBaulWithTwoChaptersAsync();
        var inSourceChapter = Photo.Create(new PhotoId(Guid.NewGuid()), new ChapterId(sourceChapterId), new BaulId(baulId), "source-key", null, CustodioId, _clock.UtcNow());
        var inTargetChapter = Photo.Create(new PhotoId(Guid.NewGuid()), new ChapterId(targetChapterId), new BaulId(baulId), "target-key", null, CustodioId, _clock.UtcNow());
        await _photoRepository.CreateAsync(inSourceChapter);
        await _photoRepository.CreateAsync(inTargetChapter);

        var manager = CreateManager(CustodioId);
        var result = await manager.GetPageAsync(new BaulId(baulId), new ChapterId(sourceChapterId), 0, 10);

        Assert.True(result.IsSuccess);
        var photo = Assert.Single(result.Value.Items);
        Assert.Equal(inSourceChapter.Id.ToString(), photo.Id);
    }

    [Fact]
    public async Task GetPageAsync_ShouldSetHasMore_WhenMorePhotosThanTake()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        for (var i = 0; i < 3; i++)
        {
            await _photoRepository.CreateAsync(Photo.Create(
                new PhotoId(Guid.NewGuid()), new ChapterId(chapterId), new BaulId(baulId), $"key-{i}", null, CustodioId, _clock.UtcNow()));
        }

        var manager = CreateManager(CustodioId);
        var result = await manager.GetPageAsync(new BaulId(baulId), null, 0, 2);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Items.Count);
        Assert.True(result.Value.HasMore);
    }

    [Fact]
    public async Task GetPageAsync_ShouldClearHasMore_WhenAllPhotosFitInPage()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        for (var i = 0; i < 2; i++)
        {
            await _photoRepository.CreateAsync(Photo.Create(
                new PhotoId(Guid.NewGuid()), new ChapterId(chapterId), new BaulId(baulId), $"key-{i}", null, CustodioId, _clock.UtcNow()));
        }

        var manager = CreateManager(CustodioId);
        var result = await manager.GetPageAsync(new BaulId(baulId), null, 0, 10);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Items.Count);
        Assert.False(result.Value.HasMore);
    }

    [Fact]
    public async Task GetPageAsync_ShouldExcludeDeletedPhotos()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        await manager.DeleteAsync(new PhotoId(photoId), "reason");
        var result = await manager.GetPageAsync(new BaulId(baulId), null, 0, 10);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value.Items);
    }

    [Fact]
    public async Task GetPageAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var (baulId, _) = await SeedBaulWithChapterAsync();
        var manager = CreateManager("stranger");
        var result = await manager.GetPageAsync(new BaulId(baulId), null, 0, 10);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task GetPageAsync_ShouldFail_WhenChapterDoesNotBelongToBaul()
    {
        var (baulId, _) = await SeedBaulWithChapterAsync();
        var (_, otherChapterId) = await SeedBaulWithChapterAsync();

        var manager = CreateManager(CustodioId);
        var result = await manager.GetPageAsync(new BaulId(baulId), new ChapterId(otherChapterId), 0, 10);

        Assert.True(result.IsFailure);
        Assert.Equal("Chapter not found", result.Error.Message);
    }

    [Fact]
    public async Task UploadAsync_ShouldLeavePhotoUndated_WhenNoDateGivenAndNoExifFound()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(new ChapterId(chapterId), content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.DateYear);
        Assert.Null(result.Value.DateMonth);
        Assert.Null(result.Value.DateDay);
    }

    [Fact]
    public async Task UploadAsync_ShouldUseExifDate_WhenNoExplicitDateGiven()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();
        _photoDateExtractor.NextResult = (2019, 8, 3);
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(new ChapterId(chapterId), content, "photo.jpg", "image/jpeg", null, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Equal(2019, result.Value.DateYear);
        Assert.Equal(8, result.Value.DateMonth);
        Assert.Equal(3, result.Value.DateDay);
    }

    [Fact]
    public async Task UploadAsync_ShouldPreferExplicitDate_OverExif()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();
        _photoDateExtractor.NextResult = (2019, 8, 3);
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(
            new ChapterId(chapterId), content, "photo.jpg", "image/jpeg", PhotoDates.Of(2021, 1, 2), new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Equal(2021, result.Value.DateYear);
        Assert.Equal(1, result.Value.DateMonth);
        Assert.Equal(2, result.Value.DateDay);
    }

    [Fact]
    public async Task UploadAsync_ShouldAcceptPartialExplicitDate_YearOnly()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(
            new ChapterId(chapterId), content, "photo.jpg", "image/jpeg", PhotoDates.Of(2020), new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Equal(2020, result.Value.DateYear);
        Assert.Null(result.Value.DateMonth);
        Assert.Null(result.Value.DateDay);
    }

    [Fact]
    public async Task UploadAsync_ShouldAcceptPartialExplicitDate_YearAndMonth()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(
            new ChapterId(chapterId), content, "photo.jpg", "image/jpeg", PhotoDates.Of(2020, 6), new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.Equal(2020, result.Value.DateYear);
        Assert.Equal(6, result.Value.DateMonth);
        Assert.Null(result.Value.DateDay);
    }

    [Fact]
    public async Task ChangeDateAsync_ShouldUpdatePhotoDate()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.ChangeDateAsync(new PhotoId(photoId), PhotoDates.Of(2020, 5));

        Assert.True(result.IsSuccess);
        Assert.Equal(2020, result.Value.DateYear);
        Assert.Equal(5, result.Value.DateMonth);
        Assert.Null(result.Value.DateDay);
    }

    [Fact]
    public async Task DownloadAsync_ShouldReturnOriginalContentAndFileName()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        var storageKey = $"{CustodioId}/{Guid.NewGuid()}-vacaciones.jpg";
        await _photoStorage.SaveAsync(storageKey, new MemoryStream([1, 2, 3]), "image/jpeg");
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), storageKey, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.DownloadAsync(new PhotoId(photoId));

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
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var ownPhotoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(ownPhotoId), new ChapterId(chapterId), new BaulId(baulId), "key-1", null, CustodioId, _clock.UtcNow()));

        var otherBaulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(otherBaulId), "Otro", null, "someone-else", 0, _clock.UtcNow(), _clock.UtcNow()));
        var foreignPhotoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(foreignPhotoId), null, new BaulId(otherBaulId), "key-2", null, "someone-else", _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.ChangeDateBatchAsync([new PhotoId(ownPhotoId), new PhotoId(foreignPhotoId)], PhotoDates.Of(2018));

        Assert.True(result.IsSuccess);
        var updated = Assert.Single(result.Value);
        Assert.Equal(ownPhotoId.ToString(), updated.Id);
        Assert.Equal(2018, updated.DateYear);
    }

    [Fact]
    public async Task GetByPersonaIdAsync_ShouldReturnTaggedPhotos_OrderedChronologically()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var personaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuelo Antonio", BaulRole.Colaborador, _clock.UtcNow()));

        var newerPhotoId = Guid.NewGuid();
        var olderPhotoId = Guid.NewGuid();
        var undatedPhotoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(newerPhotoId), new ChapterId(chapterId), new BaulId(baulId), "newer", PhotoDates.Of(2020, 5, 10), CustodioId, _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(olderPhotoId), new ChapterId(chapterId), new BaulId(baulId), "older", PhotoDates.Of(1998, 6, 15), CustodioId, _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(undatedPhotoId), new ChapterId(chapterId), new BaulId(baulId), "undated", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var tagManager = CreateTagManager(CustodioId);
        await tagManager.SetTaggedPersonasAsync(new PhotoId(newerPhotoId), [new PersonaId(personaId)]);
        await tagManager.SetTaggedPersonasAsync(new PhotoId(olderPhotoId), [new PersonaId(personaId)]);
        await tagManager.SetTaggedPersonasAsync(new PhotoId(undatedPhotoId), [new PersonaId(personaId)]);

        var result = await manager.GetByPersonaIdAsync(new BaulId(baulId), new PersonaId(personaId));

        Assert.True(result.IsSuccess);
        Assert.Equal([olderPhotoId.ToString(), newerPhotoId.ToString(), undatedPhotoId.ToString()], result.Value.Select(p => p.Id));
    }

    [Fact]
    public async Task GetByPersonaIdAsync_ShouldExcludeSoftDeletedPhotos()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var personaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuelo Antonio", BaulRole.Colaborador, _clock.UtcNow()));

        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        await CreateTagManager(CustodioId).SetTaggedPersonasAsync(new PhotoId(photoId), [new PersonaId(personaId)]);
        await manager.DeleteAsync(new PhotoId(photoId), "duplicada");

        var result = await manager.GetByPersonaIdAsync(new BaulId(baulId), new PersonaId(personaId));

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value);
    }

    [Fact]
    public async Task GetByPersonaIdAsync_ShouldFail_WhenPersonaBelongsToAnotherBaul()
    {
        var (baulId, _) = await SeedBaulWithChapterAsync();
        var otherBaulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(otherBaulId), "Otro", null, "someone-else", 0, _clock.UtcNow(), _clock.UtcNow()));
        var foreignPersonaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(foreignPersonaId), new BaulId(otherBaulId), null, "Ajeno", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetByPersonaIdAsync(new BaulId(baulId), new PersonaId(foreignPersonaId));

        Assert.True(result.IsFailure);
        Assert.Equal("Persona not found", result.Error.Message);
    }
}
