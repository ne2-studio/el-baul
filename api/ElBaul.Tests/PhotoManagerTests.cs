using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace ElBaul.Tests;

public class PhotoManagerTests
{
    private const string CustodioId = "custodio-1";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryAlbumRepository _albumRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly InMemoryUserRepository _userRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();
    private readonly FakePhotoDateExtractor _photoDateExtractor = new();

    private PhotoManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(NullLogger<PhotoManager>.Instance, _photoRepository, _albumRepository, _baulRepository, _photoStorage,
            _recuerdoRepository, _userRepository, new StaticIdGenerator(nextId ?? Guid.NewGuid()), _clock,
            new StaticCurrentUserProvider(currentUserId), _photoDateExtractor);

    private async Task<(Guid baulId, Guid albumId)> SeedBaulWithAlbumAsync()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 0, null, _clock.UtcNow(), _clock.UtcNow()));
        return (baulId, albumId);
    }

    private async Task<(Guid baulId, Guid sourceAlbumId, Guid targetAlbumId)> SeedBaulWithTwoAlbumsAsync()
    {
        var (baulId, sourceAlbumId) = await SeedBaulWithAlbumAsync();
        var targetAlbumId = Guid.NewGuid();
        await _albumRepository.CreateAsync(new Album(targetAlbumId, baulId, "Destino", null, 0, null, _clock.UtcNow(), _clock.UtcNow()));
        return (baulId, sourceAlbumId, targetAlbumId);
    }

    [Fact]
    public async Task UploadAsync_ShouldSaveFile_AndIncrementAlbumPhotoCount()
    {
        var (_, albumId) = await SeedBaulWithAlbumAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(albumId, content, "photo.jpg", "image/jpeg", "Caption", null, Guid.NewGuid());

        Assert.True(result.IsSuccess);
        Assert.Single(_photoStorage.SavedKeys);

        var album = await _albumRepository.GetByIdAsync(albumId);
        Assert.Equal(1, album!.PhotoCount);
    }

    [Fact]
    public async Task UploadAsync_ShouldSetFirstPhotoAsCover()
    {
        var (_, albumId) = await SeedBaulWithAlbumAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        await manager.UploadAsync(albumId, content, "photo.jpg", "image/jpeg", null, null, Guid.NewGuid());

        var album = await _albumRepository.GetByIdAsync(albumId);
        Assert.False(string.IsNullOrEmpty(album!.CoverPhotoKey));
    }

    [Fact]
    public async Task UploadAsync_ShouldSetBaulCover_WhenBaulHasNoCoverYet()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        await manager.UploadAsync(albumId, content, "photo.jpg", "image/jpeg", null, null, Guid.NewGuid());

        var baul = await _baulRepository.GetByIdAsync(baulId);
        Assert.False(string.IsNullOrEmpty(baul!.CoverPhotoKey));
    }

    [Fact]
    public async Task UploadAsync_ShouldNotOverwriteExistingBaulCover()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        var existingBaul = await _baulRepository.GetByIdAsync(baulId);
        await _baulRepository.UpdateAsync(existingBaul! with { CoverPhotoKey = "existing-key" });

        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream([1, 2, 3]);
        await manager.UploadAsync(albumId, content, "photo.jpg", "image/jpeg", null, null, Guid.NewGuid());

        var baul = await _baulRepository.GetByIdAsync(baulId);
        Assert.Equal("existing-key", baul!.CoverPhotoKey);
    }

    [Fact]
    public async Task UploadAsync_ShouldDenyAccess_ForMiembroRole()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        const string miembroId = "miembro-1";
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, miembroId, "m@test.com", BaulRole.Miembro, SharedUserStatus.Active, _clock.UtcNow()));

        var manager = CreateManager(miembroId);
        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(albumId, content, "photo.jpg", "image/jpeg", null, null, Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task UploadAsync_ShouldPropagateException_WhenStorageSaveFails()
    {
        var (_, albumId) = await SeedBaulWithAlbumAsync();
        var failingStorage = Substitute.For<IPhotoStorage>();
        failingStorage.SaveAsync(Arg.Any<string>(), Arg.Any<Stream>(), Arg.Any<string>())
            .Returns<Task>(_ => throw new InvalidOperationException("storage unavailable"));

        var manager = new PhotoManager(
            NullLogger<PhotoManager>.Instance, _photoRepository, _albumRepository, _baulRepository, failingStorage,
            _recuerdoRepository, _userRepository, new StaticIdGenerator(Guid.NewGuid()), _clock,
            new StaticCurrentUserProvider(CustodioId), _photoDateExtractor);

        using var content = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => manager.UploadAsync(albumId, content, "photo.jpg", "image/jpeg", null, null, Guid.NewGuid()));

        Assert.Empty(await _photoRepository.GetByAlbumIdAsync(albumId));
    }

    [Fact]
    public async Task UploadAsync_ShouldDeleteOrphanedStorageObject_WhenPersistingMetadataFails()
    {
        var (_, albumId) = await SeedBaulWithAlbumAsync();
        var failingRepository = Substitute.For<IPhotoRepository>();
        failingRepository.CreateAsync(Arg.Any<Photo>())
            .Returns<Task>(_ => throw new InvalidOperationException("database unavailable"));

        var manager = new PhotoManager(
            NullLogger<PhotoManager>.Instance, failingRepository, _albumRepository, _baulRepository, _photoStorage,
            _recuerdoRepository, _userRepository, new StaticIdGenerator(Guid.NewGuid()), _clock,
            new StaticCurrentUserProvider(CustodioId), _photoDateExtractor);

        using var content = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => manager.UploadAsync(albumId, content, "photo.jpg", "image/jpeg", null, null, Guid.NewGuid()));

        // The file was saved to storage before the DB write failed, so the manager
        // must compensate by deleting it to avoid leaving an orphaned blob.
        Assert.Single(_photoStorage.SavedKeys);
        Assert.Equal(_photoStorage.SavedKeys, _photoStorage.DeletedKeys);
    }

    [Fact]
    public async Task UploadToBaulAsync_ShouldDeleteOrphanedStorageObject_WhenPersistingMetadataFails()
    {
        var (baulId, _) = await SeedBaulWithAlbumAsync();
        var failingRepository = Substitute.For<IPhotoRepository>();
        failingRepository.CreateAsync(Arg.Any<Photo>())
            .Returns<Task>(_ => throw new InvalidOperationException("database unavailable"));

        var manager = new PhotoManager(
            NullLogger<PhotoManager>.Instance, failingRepository, _albumRepository, _baulRepository, _photoStorage,
            _recuerdoRepository, _userRepository, new StaticIdGenerator(Guid.NewGuid()), _clock,
            new StaticCurrentUserProvider(CustodioId), _photoDateExtractor);

        using var content = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => manager.UploadToBaulAsync(baulId, content, "photo.jpg", "image/jpeg", null, null, Guid.NewGuid()));

        Assert.Single(_photoStorage.SavedKeys);
        Assert.Equal(_photoStorage.SavedKeys, _photoStorage.DeletedKeys);
    }

    [Fact]
    public async Task UploadAsync_ShouldReturnExistingPhoto_WhenClientUploadIdAlreadyExists()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        var clientUploadId = Guid.NewGuid();
        var existingPhoto = new Photo(Guid.NewGuid(), albumId, baulId, "already-uploaded-key", null,
            null, null, null, CustodioId, _clock.UtcNow(), clientUploadId);
        await _photoRepository.CreateAsync(existingPhoto);

        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(albumId, content, "photo.jpg", "image/jpeg", null, null, clientUploadId);

        Assert.True(result.IsSuccess);
        Assert.Equal(existingPhoto.Id.ToString(), result.Value.Id);
        // No new upload should have happened: retrying with a known clientUploadId is a no-op.
        Assert.Empty(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task UploadToBaulAsync_ShouldReturnExistingPhoto_WhenClientUploadIdAlreadyExists()
    {
        var (baulId, _) = await SeedBaulWithAlbumAsync();
        var clientUploadId = Guid.NewGuid();
        var existingPhoto = new Photo(Guid.NewGuid(), null, baulId, "already-uploaded-key", null,
            null, null, null, CustodioId, _clock.UtcNow(), clientUploadId);
        await _photoRepository.CreateAsync(existingPhoto);

        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadToBaulAsync(baulId, content, "photo.jpg", "image/jpeg", null, null, clientUploadId);

        Assert.True(result.IsSuccess);
        Assert.Equal(existingPhoto.Id.ToString(), result.Value.Id);
        Assert.Empty(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldStampIsOwn_ForTheAuthor()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "key", null, null, null, null, CustodioId, _clock.UtcNow()));
        _userRepository.Seed(new User(CustodioId, "custodio@test.com", "Custodio", _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(photoId, "Que buen recuerdo");

        Assert.True(result.IsSuccess);
        Assert.True(result.Value.IsOwn);
        Assert.Equal("Custodio", result.Value.UserName);
    }

    [Fact]
    public async Task GetRecuerdosAsync_ShouldMarkIsOwn_OnlyForCurrentUsersEntries()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "key", null, null, null, null, CustodioId, _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(Guid.NewGuid(), photoId, CustodioId, "mine", _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(Guid.NewGuid(), photoId, "other-user", "not mine", _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetRecuerdosAsync(photoId);

        Assert.True(result.IsSuccess);
        var list = result.Value.ToList();
        Assert.True(list.Single(r => r.Text == "mine").IsOwn);
        Assert.False(list.Single(r => r.Text == "not mine").IsOwn);
    }

    [Fact]
    public async Task GetByAlbumIdAsync_ShouldFail_WhenAlbumDoesNotExist()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.GetByAlbumIdAsync(Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("Album not found", result.Error);
    }

    [Fact]
    public async Task MoveAsync_ShouldReassignAlbumId_AndUpdatePhotoCounts()
    {
        var (baulId, sourceAlbumId, targetAlbumId) = await SeedBaulWithTwoAlbumsAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(photoId, sourceAlbumId, baulId, "key", null, null, null, null, CustodioId, _clock.UtcNow()));
        var sourceAlbum = await _albumRepository.GetByIdAsync(sourceAlbumId);
        await _albumRepository.UpdateAsync(sourceAlbum! with { PhotoCount = 1 });

        var manager = CreateManager(CustodioId);
        var result = await manager.MoveAsync(photoId, targetAlbumId);

        Assert.True(result.IsSuccess);
        Assert.Equal(targetAlbumId.ToString(), result.Value.AlbumId);

        var updatedSource = await _albumRepository.GetByIdAsync(sourceAlbumId);
        var updatedTarget = await _albumRepository.GetByIdAsync(targetAlbumId);
        Assert.Equal(0, updatedSource!.PhotoCount);
        Assert.Equal(1, updatedTarget!.PhotoCount);
    }

    [Fact]
    public async Task MoveAsync_ShouldClearSourceCover_WhenMovedPhotoWasTheCover()
    {
        var (baulId, sourceAlbumId, targetAlbumId) = await SeedBaulWithTwoAlbumsAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(photoId, sourceAlbumId, baulId, "cover-key", null, null, null, null, CustodioId, _clock.UtcNow()));
        var sourceAlbum = await _albumRepository.GetByIdAsync(sourceAlbumId);
        await _albumRepository.UpdateAsync(sourceAlbum! with { PhotoCount = 1, CoverPhotoKey = "cover-key" });

        var manager = CreateManager(CustodioId);
        await manager.MoveAsync(photoId, targetAlbumId);

        var updatedSource = await _albumRepository.GetByIdAsync(sourceAlbumId);
        Assert.Null(updatedSource!.CoverPhotoKey);
    }

    [Fact]
    public async Task MoveAsync_ShouldSetTargetCover_WhenTargetHasNoCoverYet()
    {
        var (baulId, sourceAlbumId, targetAlbumId) = await SeedBaulWithTwoAlbumsAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(photoId, sourceAlbumId, baulId, "key", null, null, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        await manager.MoveAsync(photoId, targetAlbumId);

        var updatedTarget = await _albumRepository.GetByIdAsync(targetAlbumId);
        Assert.Equal("key", updatedTarget!.CoverPhotoKey);
    }

    [Fact]
    public async Task MoveAsync_ShouldFail_WhenTargetAlbumInDifferentBaul()
    {
        var (baulId, sourceAlbumId, _) = await SeedBaulWithTwoAlbumsAsync();
        var (_, otherBaulAlbumId) = await SeedBaulWithAlbumAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(photoId, sourceAlbumId, baulId, "key", null, null, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.MoveAsync(photoId, otherBaulAlbumId);

        Assert.True(result.IsFailure);
        Assert.Equal("Target album not found", result.Error);
    }

    [Fact]
    public async Task MoveAsync_ShouldDenyAccess_ForMiembroRole()
    {
        var (baulId, sourceAlbumId, targetAlbumId) = await SeedBaulWithTwoAlbumsAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(photoId, sourceAlbumId, baulId, "key", null, null, null, null, CustodioId, _clock.UtcNow()));
        const string miembroId = "miembro-1";
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, miembroId, "m@test.com", BaulRole.Miembro, SharedUserStatus.Active, _clock.UtcNow()));

        var manager = CreateManager(miembroId);
        var result = await manager.MoveAsync(photoId, targetAlbumId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task DeleteAsync_ShouldSoftDeletePhoto_AndDecrementAlbumPhotoCount_ForCustodio()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "key", null, null, null, null, CustodioId, _clock.UtcNow()));
        var album = await _albumRepository.GetByIdAsync(albumId);
        await _albumRepository.UpdateAsync(album! with { PhotoCount = 1 });

        var manager = CreateManager(CustodioId);
        var result = await manager.DeleteAsync(photoId, "Foto duplicada");

        Assert.True(result.IsSuccess);

        var deletedPhoto = await _photoRepository.GetByIdAsync(photoId);
        Assert.Equal(PhotoStatus.Deleted, deletedPhoto!.Status);
        Assert.Equal("Foto duplicada", deletedPhoto.DeletionReason);
        Assert.Equal(_clock.UtcNow(), deletedPhoto.DeletedAt);

        var updatedAlbum = await _albumRepository.GetByIdAsync(albumId);
        Assert.Equal(0, updatedAlbum!.PhotoCount);
    }

    [Fact]
    public async Task DeleteAsync_ShouldHidePhotoFromAlbumListing()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "key", null, null, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        await manager.DeleteAsync(photoId, "Ya no aplica");

        var result = await manager.GetByAlbumIdAsync(albumId);
        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value);
    }

    [Fact]
    public async Task DeleteAsync_ShouldNotRequireAlbum_ForLoosePhoto()
    {
        var (baulId, _) = await SeedBaulWithAlbumAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(photoId, null, baulId, "key", null, null, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.DeleteAsync(photoId, null);

        Assert.True(result.IsSuccess);
        var deletedPhoto = await _photoRepository.GetByIdAsync(photoId);
        Assert.Equal(PhotoStatus.Deleted, deletedPhoto!.Status);
    }

    [Fact]
    public async Task DeleteAsync_ShouldDenyAccess_ForColaboradorRole()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "key", null, null, null, null, CustodioId, _clock.UtcNow()));
        const string colaboradorId = "colaborador-1";
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, colaboradorId, "c@test.com", BaulRole.Colaborador, SharedUserStatus.Active, _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.DeleteAsync(photoId, "reason");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);

        var photo = await _photoRepository.GetByIdAsync(photoId);
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
    public async Task UploadToBaulAsync_ShouldSaveFile_WithNullAlbumId()
    {
        var (baulId, _) = await SeedBaulWithAlbumAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadToBaulAsync(baulId, content, "photo.jpg", "image/jpeg", "Caption", null, Guid.NewGuid());

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.AlbumId);
        Assert.Single(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task UploadToBaulAsync_ShouldSetBaulCover_WhenBaulHasNoCoverYet()
    {
        var (baulId, _) = await SeedBaulWithAlbumAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        await manager.UploadToBaulAsync(baulId, content, "photo.jpg", "image/jpeg", null, null, Guid.NewGuid());

        var baul = await _baulRepository.GetByIdAsync(baulId);
        Assert.False(string.IsNullOrEmpty(baul!.CoverPhotoKey));
    }

    [Fact]
    public async Task UploadToBaulAsync_ShouldDenyAccess_ForMiembroRole()
    {
        var (baulId, _) = await SeedBaulWithAlbumAsync();
        const string miembroId = "miembro-1";
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, miembroId, "m@test.com", BaulRole.Miembro, SharedUserStatus.Active, _clock.UtcNow()));

        var manager = CreateManager(miembroId);
        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadToBaulAsync(baulId, content, "photo.jpg", "image/jpeg", null, null, Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task GetLooseByBaulIdAsync_ShouldReturnOnlyAlbumlessPhotos()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        await _photoRepository.CreateAsync(new Photo(Guid.NewGuid(), albumId, baulId, "in-album-key", null, null, null, null, CustodioId, _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(Guid.NewGuid(), null, baulId, "loose-key", null, null, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetLooseByBaulIdAsync(baulId);

        Assert.True(result.IsSuccess);
        var photo = Assert.Single(result.Value);
        Assert.Null(photo.AlbumId);
    }

    [Fact]
    public async Task UploadAsync_ShouldLeavePhotoUndated_WhenNoDateGivenAndNoExifFound()
    {
        var (_, albumId) = await SeedBaulWithAlbumAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(albumId, content, "photo.jpg", "image/jpeg", null, null, Guid.NewGuid());

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.DateYear);
        Assert.Null(result.Value.DateMonth);
        Assert.Null(result.Value.DateDay);
    }

    [Fact]
    public async Task UploadAsync_ShouldUseExifDate_WhenNoExplicitDateGiven()
    {
        var (_, albumId) = await SeedBaulWithAlbumAsync();
        _photoDateExtractor.NextResult = (2019, 8, 3);
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(albumId, content, "photo.jpg", "image/jpeg", null, null, Guid.NewGuid());

        Assert.True(result.IsSuccess);
        Assert.Equal(2019, result.Value.DateYear);
        Assert.Equal(8, result.Value.DateMonth);
        Assert.Equal(3, result.Value.DateDay);
    }

    [Fact]
    public async Task UploadAsync_ShouldPreferExplicitDate_OverExif()
    {
        var (_, albumId) = await SeedBaulWithAlbumAsync();
        _photoDateExtractor.NextResult = (2019, 8, 3);
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadAsync(
            albumId, content, "photo.jpg", "image/jpeg", null, new DateTime(2021, 1, 2), Guid.NewGuid());

        Assert.True(result.IsSuccess);
        Assert.Equal(2021, result.Value.DateYear);
        Assert.Equal(1, result.Value.DateMonth);
        Assert.Equal(2, result.Value.DateDay);
    }

    [Fact]
    public async Task ChangeDateAsync_ShouldUpdatePhotoDate()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "key", null, null, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.ChangeDateAsync(photoId, 2020, 5, null);

        Assert.True(result.IsSuccess);
        Assert.Equal(2020, result.Value.DateYear);
        Assert.Equal(5, result.Value.DateMonth);
        Assert.Null(result.Value.DateDay);
    }

    [Fact]
    public async Task ChangeDateAsync_ShouldDenyAccess_ForMiembroRole()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "key", null, null, null, null, CustodioId, _clock.UtcNow()));
        const string miembroId = "miembro-1";
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, miembroId, "m@test.com", BaulRole.Miembro, SharedUserStatus.Active, _clock.UtcNow()));

        var manager = CreateManager(miembroId);
        var result = await manager.ChangeDateAsync(photoId, 2020, null, null);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task ChangeDateAsync_ShouldReject_WhenDayGivenWithoutMonth()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "key", null, null, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.ChangeDateAsync(photoId, 2020, null, 15);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task ChangeDateBatchAsync_ShouldUpdateAllValidPhotos_AndSkipInaccessibleOnes()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        var ownPhotoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(ownPhotoId, albumId, baulId, "key-1", null, null, null, null, CustodioId, _clock.UtcNow()));

        var otherBaulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(otherBaulId, "Otro", null, "someone-else", 0, _clock.UtcNow(), _clock.UtcNow()));
        var foreignPhotoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(foreignPhotoId, null, otherBaulId, "key-2", null, null, null, null, "someone-else", _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.ChangeDateBatchAsync([ownPhotoId, foreignPhotoId], 2018, null, null);

        Assert.True(result.IsSuccess);
        var updated = Assert.Single(result.Value);
        Assert.Equal(ownPhotoId.ToString(), updated.Id);
        Assert.Equal(2018, updated.DateYear);
    }
}
