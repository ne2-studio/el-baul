using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;

namespace ElBaul.Tests;

public class AlbumManagerTests
{
    private const string CustodioId = "custodio-1";
    private const string MiembroId = "miembro-1";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryAlbumRepository _albumRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly InMemoryUserRepository _userRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();

    private AlbumManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(_albumRepository, _baulRepository, _photoRepository, _recuerdoRepository, _userRepository, _photoStorage,
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), _clock, new StaticCurrentUserProvider(currentUserId));

    [Fact]
    public async Task CreateAsync_ShouldIncrementBaulAlbumCount()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateAsync(baulId, "Vacaciones", null);

        Assert.True(result.IsSuccess);
        var baul = await _baulRepository.GetByIdAsync(baulId);
        Assert.Equal(1, baul!.AlbumCount);
    }

    [Fact]
    public async Task CreateAsync_ShouldDenyAccess_ForMiembroRole()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, MiembroId, "m@test.com", BaulRole.Miembro, SharedUserStatus.Active, _clock.UtcNow()));

        var manager = CreateManager(MiembroId);
        var result = await manager.CreateAsync(baulId, "Vacaciones", null);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task CreateAsync_ShouldAllow_ForColaboradorRole()
    {
        var baulId = Guid.NewGuid();
        const string colaboradorId = "colaborador-1";
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, colaboradorId, "c@test.com", BaulRole.Colaborador, SharedUserStatus.Active, _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.CreateAsync(baulId, "Vacaciones", null);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task GetByBaulIdAsync_ShouldDenyAccess_WhenUserHasNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager("stranger");
        var result = await manager.GetByBaulIdAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task GetByBaulIdAsync_ShouldResolveSignedUrls_ForCoverPhotos()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 1, "cover-key", _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetByBaulIdAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Contains("cover-key", result.Value.Single().CoverPhotoUrl);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldSetCoverPhotoKey_ForCustodio()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "photo-key", null, _clock.UtcNow(), CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(albumId, photoId);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value.CoverPhotoUrl);

        var album = await _albumRepository.GetByIdAsync(albumId);
        Assert.Equal("photo-key", album!.CoverPhotoKey);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldAllow_ForColaboradorRole()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        const string colaboradorId = "colaborador-1";
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, colaboradorId, "c@test.com", BaulRole.Colaborador, SharedUserStatus.Active, _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "photo-key", null, _clock.UtcNow(), colaboradorId, _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.SetCoverAsync(albumId, photoId);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldDenyAccess_ForMiembroRole()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, MiembroId, "m@test.com", BaulRole.Miembro, SharedUserStatus.Active, _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "photo-key", null, _clock.UtcNow(), CustodioId, _clock.UtcNow()));

        var manager = CreateManager(MiembroId);
        var result = await manager.SetCoverAsync(albumId, photoId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldFail_WhenPhotoDoesNotExist()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(albumId, Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldFail_WhenPhotoBelongsToDifferentAlbum()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        var otherAlbumId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 0, null, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(otherAlbumId, baulId, "Otro album", null, 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(photoId, otherAlbumId, baulId, "photo-key", null, _clock.UtcNow(), CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(albumId, photoId);

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error);
    }
}
