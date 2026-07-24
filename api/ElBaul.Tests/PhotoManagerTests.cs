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
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();
    private readonly FakePhotoDateExtractor _photoDateExtractor = new();

    private PhotoManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(NullLogger<PhotoManager>.Instance, _photoRepository, _chapterRepository, _baulRepository, _photoStorage,
            _recuerdoRepository, new StaticIdGenerator(nextId ?? Guid.NewGuid()), _clock,
            new StaticCurrentUserProvider(currentUserId), _photoDateExtractor, new BaulAccessService(_baulRepository));

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
        var result = await manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, Guid.NewGuid());

        Assert.True(result.IsSuccess);
        Assert.Single(_photoStorage.SavedKeys);

        var chapter = await _chapterRepository.GetByIdAsync(new ChapterId(chapterId));
        Assert.Equal(1, chapter!.PhotoCount);
    }

    [Fact]
    public async Task UploadAsync_ShouldSetFirstPhotoAsCover()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        await manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, Guid.NewGuid());

        var chapter = await _chapterRepository.GetByIdAsync(new ChapterId(chapterId));
        Assert.False(string.IsNullOrEmpty(chapter!.CoverPhotoKey));
    }

    [Fact]
    public async Task UploadAsync_ShouldSetBaulCover_WhenBaulHasNoCoverYet()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        await manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, Guid.NewGuid());

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
        await manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, Guid.NewGuid());

        var baul = await _baulRepository.GetByIdAsync(new BaulId(baulId));
        Assert.Equal("existing-key", baul!.CoverPhotoKey);
    }

    [Fact]
    public async Task UploadAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();

        var manager = CreateManager("stranger");
        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task UploadAsync_ShouldPropagateException_WhenStorageSaveFails()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();
        var failingStorage = Substitute.For<IPhotoStorage>();
        failingStorage.SaveAsync(Arg.Any<string>(), Arg.Any<Stream>(), Arg.Any<string>())
            .Returns<Task>(_ => throw new InvalidOperationException("storage unavailable"));

        var manager = new PhotoManager(
            NullLogger<PhotoManager>.Instance, _photoRepository, _chapterRepository, _baulRepository, failingStorage,
            _recuerdoRepository, new StaticIdGenerator(Guid.NewGuid()), _clock,
            new StaticCurrentUserProvider(CustodioId), _photoDateExtractor, new BaulAccessService(_baulRepository));

        using var content = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, Guid.NewGuid()));

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
            NullLogger<PhotoManager>.Instance, failingRepository, _chapterRepository, _baulRepository, _photoStorage,
            _recuerdoRepository, new StaticIdGenerator(Guid.NewGuid()), _clock,
            new StaticCurrentUserProvider(CustodioId), _photoDateExtractor, new BaulAccessService(_baulRepository));

        using var content = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, Guid.NewGuid()));

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
            NullLogger<PhotoManager>.Instance, failingRepository, _chapterRepository, _baulRepository, _photoStorage,
            _recuerdoRepository, new StaticIdGenerator(Guid.NewGuid()), _clock,
            new StaticCurrentUserProvider(CustodioId), _photoDateExtractor, new BaulAccessService(_baulRepository));

        using var content = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => manager.UploadToBaulAsync(baulId, content, "photo.jpg", "image/jpeg", null, Guid.NewGuid()));

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
        var result = await manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, clientUploadId);

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
        var result = await manager.UploadToBaulAsync(baulId, content, "photo.jpg", "image/jpeg", null, clientUploadId);

        Assert.True(result.IsSuccess);
        Assert.Equal(existingPhoto.Id.ToString(), result.Value.Id);
        Assert.Empty(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldStampIsOwn_ForTheAuthor()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(photoId, "Que buen recuerdo");

        Assert.True(result.IsSuccess);
        Assert.True(result.Value.IsOwn);
        Assert.Equal("Custodio", result.Value.UserName);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldUsePersonaNickname_ForTheAuthorName()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));
        const string colaboradorId = "colaborador-1";
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), colaboradorId, "Tito Recuerdos", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.CreateRecuerdoAsync(photoId, "Que buen recuerdo");

        Assert.True(result.IsSuccess);
        Assert.Equal("Tito Recuerdos", result.Value.UserName);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldIncludeAuthorsAvatarUrl_WhenPersonaHasOne()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));
        const string colaboradorId = "colaborador-1";
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), colaboradorId, "Tito Recuerdos", BaulRole.Colaborador, _clock.UtcNow(),
            AvatarPhotoKey: "avatar-key"));

        var manager = CreateManager(colaboradorId);
        var result = await manager.CreateRecuerdoAsync(photoId, "Que buen recuerdo");

        Assert.True(result.IsSuccess);
        Assert.Equal("https://imgproxy.test/PersonaAvatar/avatar-key", result.Value.UserAvatar);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldLeaveAvatarNull_WhenPersonaHasNone()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(photoId, "Que buen recuerdo");

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.UserAvatar);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldSetChapterId_FromThePhotosChapter()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(photoId, "Que buen recuerdo");

        Assert.True(result.IsSuccess);
        var stored = (await _recuerdoRepository.GetByPhotoIdAsync(new PhotoId(photoId))).Single();
        Assert.Equal(new ChapterId(chapterId), stored.ChapterId);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldLeaveChapterIdNull_ForLoosePhoto()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), null, new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(photoId, "Foto suelta");

        Assert.True(result.IsSuccess);
        var stored = (await _recuerdoRepository.GetByPhotoIdAsync(new PhotoId(photoId))).Single();
        Assert.Null(stored.ChapterId);
    }

    [Fact]
    public async Task GetRecuerdosAsync_ShouldMarkIsOwn_OnlyForCurrentUsersEntries()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), CustodioId, "mine", _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "other-user", "not mine", _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetRecuerdosAsync(photoId);

        Assert.True(result.IsSuccess);
        var list = result.Value.ToList();
        Assert.True(list.Single(r => r.Text == "mine").IsOwn);
        Assert.False(list.Single(r => r.Text == "not mine").IsOwn);
    }

    [Fact]
    public async Task GetByChapterIdAsync_ShouldFail_WhenChapterDoesNotExist()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.GetByChapterIdAsync(Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("Chapter not found", result.Error);
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
        var result = await manager.MoveAsync(photoId, targetChapterId);

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
        await manager.MoveAsync(photoId, targetChapterId);

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
        await manager.MoveAsync(photoId, targetChapterId);

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
        var result = await manager.MoveAsync(photoId, otherBaulChapterId);

        Assert.True(result.IsFailure);
        Assert.Equal("Target chapter not found", result.Error);
    }

    [Fact]
    public async Task MoveAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var (baulId, sourceChapterId, targetChapterId) = await SeedBaulWithTwoChaptersAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(sourceChapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager("stranger");
        var result = await manager.MoveAsync(photoId, targetChapterId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task DeleteAsync_ShouldSoftDeletePhoto_AndDecrementChapterPhotoCount_ForCustodio()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));
        var chapter = await _chapterRepository.GetByIdAsync(new ChapterId(chapterId));
        await _chapterRepository.UpdateAsync(chapter! with { PhotoCount = 1 });

        var manager = CreateManager(CustodioId);
        var result = await manager.DeleteAsync(photoId, "Foto duplicada");

        Assert.True(result.IsSuccess);

        var deletedPhoto = await _photoRepository.GetByIdAsync(new PhotoId(photoId));
        Assert.Equal(PhotoStatus.Deleted, deletedPhoto!.Status);
        Assert.Equal("Foto duplicada", deletedPhoto.DeletionReason);
        Assert.Equal(_clock.UtcNow(), deletedPhoto.DeletedAt);

        var updatedChapter = await _chapterRepository.GetByIdAsync(new ChapterId(chapterId));
        Assert.Equal(0, updatedChapter!.PhotoCount);
    }

    [Fact]
    public async Task DeleteAsync_ShouldHidePhotoFromChapterListing()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        await manager.DeleteAsync(photoId, "Ya no aplica");

        var result = await manager.GetByChapterIdAsync(chapterId);
        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value);
    }

    [Fact]
    public async Task DeleteAsync_ShouldNotRequireChapter_ForLoosePhoto()
    {
        var (baulId, _) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), null, new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.DeleteAsync(photoId, null);

        Assert.True(result.IsSuccess);
        var deletedPhoto = await _photoRepository.GetByIdAsync(new PhotoId(photoId));
        Assert.Equal(PhotoStatus.Deleted, deletedPhoto!.Status);
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
        var result = await manager.DeleteAsync(photoId, "reason");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);

        var photo = await _photoRepository.GetByIdAsync(new PhotoId(photoId));
        Assert.Equal(PhotoStatus.Active, photo!.Status);
    }

    [Fact]
    public async Task DeleteAsync_ShouldFail_WhenPhotoNotFound()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.DeleteAsync(Guid.NewGuid(), "reason");

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error);
    }

    [Fact]
    public async Task UploadToBaulAsync_ShouldSaveFile_WithNullChapterId()
    {
        var (baulId, _) = await SeedBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadToBaulAsync(baulId, content, "photo.jpg", "image/jpeg", null, Guid.NewGuid());

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
        await manager.UploadToBaulAsync(baulId, content, "photo.jpg", "image/jpeg", null, Guid.NewGuid());

        var baul = await _baulRepository.GetByIdAsync(new BaulId(baulId));
        Assert.False(string.IsNullOrEmpty(baul!.CoverPhotoKey));
    }

    [Fact]
    public async Task UploadToBaulAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var (baulId, _) = await SeedBaulWithChapterAsync();

        var manager = CreateManager("stranger");
        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadToBaulAsync(baulId, content, "photo.jpg", "image/jpeg", null, Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task GetLooseByBaulIdAsync_ShouldReturnOnlyChapterlessPhotos()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), new ChapterId(chapterId), new BaulId(baulId), "in-chapter-key", null, CustodioId, _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), null, new BaulId(baulId), "loose-key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetLooseByBaulIdAsync(baulId);

        Assert.True(result.IsSuccess);
        var photo = Assert.Single(result.Value);
        Assert.Null(photo.ChapterId);
    }

    [Fact]
    public async Task UploadAsync_ShouldLeavePhotoUndated_WhenNoDateGivenAndNoExifFound()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, Guid.NewGuid());

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
        var result = await manager.UploadAsync(chapterId, content, "photo.jpg", "image/jpeg", null, Guid.NewGuid());

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
            chapterId, content, "photo.jpg", "image/jpeg", (2021, 1, 2), Guid.NewGuid());

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
            chapterId, content, "photo.jpg", "image/jpeg", (2020, null, null), Guid.NewGuid());

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
            chapterId, content, "photo.jpg", "image/jpeg", (2020, 6, null), Guid.NewGuid());

        Assert.True(result.IsSuccess);
        Assert.Equal(2020, result.Value.DateYear);
        Assert.Equal(6, result.Value.DateMonth);
        Assert.Null(result.Value.DateDay);
    }

    [Fact]
    public async Task UploadAsync_ShouldRejectUpload_WhenExplicitDateYearOutOfRange()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(
            chapterId, content, "photo.jpg", "image/jpeg", (1500, null, null), Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Empty(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task UploadAsync_ShouldRejectUpload_WhenDayGivenWithoutMonth()
    {
        var (_, chapterId) = await SeedBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(
            chapterId, content, "photo.jpg", "image/jpeg", (2020, null, 15), Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Empty(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task UploadToBaulAsync_ShouldRejectUpload_WhenExplicitDateInvalid()
    {
        var (baulId, _) = await SeedBaulWithChapterAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadToBaulAsync(
            baulId, content, "photo.jpg", "image/jpeg", (1500, null, null), Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Empty(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task ChangeDateAsync_ShouldUpdatePhotoDate()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.ChangeDateAsync(photoId, 2020, 5, null);

        Assert.True(result.IsSuccess);
        Assert.Equal(2020, result.Value.DateYear);
        Assert.Equal(5, result.Value.DateMonth);
        Assert.Null(result.Value.DateDay);
    }

    [Fact]
    public async Task ChangeDateAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager("stranger");
        var result = await manager.ChangeDateAsync(photoId, 2020, null, null);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task ChangeDateAsync_ShouldReject_WhenDayGivenWithoutMonth()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.ChangeDateAsync(photoId, 2020, null, 15);

        Assert.True(result.IsFailure);
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
        var result = await manager.DownloadAsync(photoId);

        Assert.True(result.IsSuccess);
        Assert.Equal("image/jpeg", result.Value.ContentType);
        Assert.Equal("vacaciones.jpg", result.Value.FileName);
        using var buffer = new MemoryStream();
        await result.Value.Content.CopyToAsync(buffer);
        Assert.Equal(new byte[] { 1, 2, 3 }, buffer.ToArray());
    }

    [Fact]
    public async Task DownloadAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        var storageKey = $"{CustodioId}/{Guid.NewGuid()}-vacaciones.jpg";
        await _photoStorage.SaveAsync(storageKey, new MemoryStream([1, 2, 3]), "image/jpeg");
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), storageKey, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager("stranger");
        var result = await manager.DownloadAsync(photoId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task DownloadAsync_ShouldFail_WhenPhotoNotFound()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.DownloadAsync(Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error);
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
        var result = await manager.ChangeDateBatchAsync([ownPhotoId, foreignPhotoId], 2018, null, null);

        Assert.True(result.IsSuccess);
        var updated = Assert.Single(result.Value);
        Assert.Equal(ownPhotoId.ToString(), updated.Id);
        Assert.Equal(2018, updated.DateYear);
    }
}
