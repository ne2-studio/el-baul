using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;

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

    private PhotoManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(_photoRepository, _albumRepository, _baulRepository, _photoStorage,
            _recuerdoRepository, _userRepository, new StaticIdGenerator(nextId ?? Guid.NewGuid()), _clock,
            new StaticCurrentUserProvider(currentUserId));

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
        var result = await manager.UploadAsync(albumId, content, "photo.jpg", "image/jpeg", "Caption", null);

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
        await manager.UploadAsync(albumId, content, "photo.jpg", "image/jpeg", null, null);

        var album = await _albumRepository.GetByIdAsync(albumId);
        Assert.False(string.IsNullOrEmpty(album!.CoverPhotoKey));
    }

    [Fact]
    public async Task UploadAsync_ShouldSetBaulCover_WhenBaulHasNoCoverYet()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        await manager.UploadAsync(albumId, content, "photo.jpg", "image/jpeg", null, null);

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
        await manager.UploadAsync(albumId, content, "photo.jpg", "image/jpeg", null, null);

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
        var result = await manager.UploadAsync(albumId, content, "photo.jpg", "image/jpeg", null, null);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldStampIsOwn_ForTheAuthor()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "key", null, _clock.UtcNow(), CustodioId, _clock.UtcNow()));
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
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "key", null, _clock.UtcNow(), CustodioId, _clock.UtcNow()));
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
        await _photoRepository.CreateAsync(new Photo(photoId, sourceAlbumId, baulId, "key", null, _clock.UtcNow(), CustodioId, _clock.UtcNow()));
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
        await _photoRepository.CreateAsync(new Photo(photoId, sourceAlbumId, baulId, "cover-key", null, _clock.UtcNow(), CustodioId, _clock.UtcNow()));
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
        await _photoRepository.CreateAsync(new Photo(photoId, sourceAlbumId, baulId, "key", null, _clock.UtcNow(), CustodioId, _clock.UtcNow()));

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
        await _photoRepository.CreateAsync(new Photo(photoId, sourceAlbumId, baulId, "key", null, _clock.UtcNow(), CustodioId, _clock.UtcNow()));

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
        await _photoRepository.CreateAsync(new Photo(photoId, sourceAlbumId, baulId, "key", null, _clock.UtcNow(), CustodioId, _clock.UtcNow()));
        const string miembroId = "miembro-1";
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, miembroId, "m@test.com", BaulRole.Miembro, SharedUserStatus.Active, _clock.UtcNow()));

        var manager = CreateManager(miembroId);
        var result = await manager.MoveAsync(photoId, targetAlbumId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task UploadToBaulAsync_ShouldSaveFile_WithNullAlbumId()
    {
        var (baulId, _) = await SeedBaulWithAlbumAsync();
        var manager = CreateManager(CustodioId);

        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UploadToBaulAsync(baulId, content, "photo.jpg", "image/jpeg", "Caption", null);

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
        await manager.UploadToBaulAsync(baulId, content, "photo.jpg", "image/jpeg", null, null);

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
        var result = await manager.UploadToBaulAsync(baulId, content, "photo.jpg", "image/jpeg", null, null);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task GetLooseByBaulIdAsync_ShouldReturnOnlyAlbumlessPhotos()
    {
        var (baulId, albumId) = await SeedBaulWithAlbumAsync();
        await _photoRepository.CreateAsync(new Photo(Guid.NewGuid(), albumId, baulId, "in-album-key", null, _clock.UtcNow(), CustodioId, _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(Guid.NewGuid(), null, baulId, "loose-key", null, _clock.UtcNow(), CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetLooseByBaulIdAsync(baulId);

        Assert.True(result.IsSuccess);
        var photo = Assert.Single(result.Value);
        Assert.Null(photo.AlbumId);
    }
}
