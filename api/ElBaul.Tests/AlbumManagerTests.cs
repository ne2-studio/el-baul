using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Tests;

public class AlbumManagerTests
{
    private const string CustodioId = "custodio-1";
    private const string StrangerId = "stranger";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryAlbumRepository _albumRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();

    private AlbumManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(NullLogger<AlbumManager>.Instance, _albumRepository, _baulRepository, _photoRepository,
            _recuerdoRepository, _photoStorage,
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
    public async Task CreateAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(StrangerId);
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
            Guid.NewGuid(), baulId, colaboradorId, "Colaborador", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.CreateAsync(baulId, "Vacaciones", null);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task GetByBaulIdAsync_ShouldDenyAccess_WhenUserHasNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(StrangerId);
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
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "photo-key", null, null, null, null, CustodioId, _clock.UtcNow()));

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
            Guid.NewGuid(), baulId, colaboradorId, "Colaborador", BaulRole.Colaborador, _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "photo-key", null, null, null, null, colaboradorId, _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.SetCoverAsync(albumId, photoId);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "photo-key", null, null, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(StrangerId);
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
        await _photoRepository.CreateAsync(new Photo(photoId, otherAlbumId, baulId, "photo-key", null, null, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(albumId, photoId);

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error);
    }

    [Fact]
    public async Task UpdateAsync_ShouldUpdateNameAndDescription_ForCustodio()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", "desc vieja", 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.UpdateAsync(albumId, "Vacaciones 2024", "desc nueva");

        Assert.True(result.IsSuccess);
        Assert.Equal("Vacaciones 2024", result.Value.Name);
        Assert.Equal("desc nueva", result.Value.Description);

        var album = await _albumRepository.GetByIdAsync(albumId);
        Assert.Equal("Vacaciones 2024", album!.Name);
        Assert.Equal("desc nueva", album.Description);
    }

    [Fact]
    public async Task UpdateAsync_ShouldAllow_ForColaboradorRole()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        const string colaboradorId = "colaborador-1";
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, colaboradorId, "Colaborador", BaulRole.Colaborador, _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.UpdateAsync(albumId, "Vacaciones 2024", null);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task UpdateAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(StrangerId);
        var result = await manager.UpdateAsync(albumId, "Vacaciones 2024", null);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task UpdateAsync_ShouldFail_WhenAlbumDoesNotExist()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.UpdateAsync(Guid.NewGuid(), "Vacaciones 2024", null);

        Assert.True(result.IsFailure);
        Assert.Equal("Album not found", result.Error);
    }

    [Fact]
    public async Task GetByBaulIdAsync_ShouldCountRecuerdos_RegardlessOfPhotoAssociation()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "k1", null, null, null, null, CustodioId, _clock.UtcNow()));

        // Photo-attached recuerdo, plus a chapter-level one with no photo at all — both
        // must count (this used to only count recuerdos joined through the album's
        // currently-active photos, silently dropping photo-less ones).
        await _recuerdoRepository.CreateAsync(new Recuerdo(Guid.NewGuid(), photoId, albumId, baulId, CustodioId, "con foto", _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(Guid.NewGuid(), null, albumId, baulId, CustodioId, "sin foto", _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetByBaulIdAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Single().RecuerdoCount);
    }

    [Fact]
    public async Task GetByBaulIdAsync_ShouldComputeDateRangeAndUndatedCount()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 3, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(Guid.NewGuid(), albumId, baulId, "k1", null, 2020, 5, 10, CustodioId, _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(Guid.NewGuid(), albumId, baulId, "k2", null, 2018, null, null, CustodioId, _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(Guid.NewGuid(), albumId, baulId, "k3", null, null, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetByBaulIdAsync(baulId);

        Assert.True(result.IsSuccess);
        var dto = result.Value.Single();
        Assert.Equal(2018, dto.MinDateYear);
        Assert.Null(dto.MinDateMonth);
        Assert.Equal(2020, dto.MaxDateYear);
        Assert.Equal(5, dto.MaxDateMonth);
        Assert.Equal(10, dto.MaxDateDay);
        Assert.Equal(1, dto.UndatedPhotoCount);
    }

    [Fact]
    public async Task GetByBaulIdAsync_ShouldSortAlbumsChronologically_OldestFirst_UndatedLast()
    {
        var baulId = Guid.NewGuid();
        var olderAlbumId = Guid.NewGuid();
        var recentAlbumId = Guid.NewGuid();
        var undatedAlbumId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(olderAlbumId, baulId, "Antiguo", null, 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(recentAlbumId, baulId, "Reciente", null, 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(undatedAlbumId, baulId, "Sin fecha", null, 0, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(Guid.NewGuid(), olderAlbumId, baulId, "k1", null, 2015, null, null, CustodioId, _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(Guid.NewGuid(), recentAlbumId, baulId, "k2", null, 2022, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetByBaulIdAsync(baulId);

        Assert.True(result.IsSuccess);
        var ids = result.Value.Select(a => a.Id).ToList();
        Assert.Equal([olderAlbumId.ToString(), recentAlbumId.ToString(), undatedAlbumId.ToString()], ids);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldCreateRecuerdoWithNoPhoto()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(albumId, "Que buen viaje");

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.PhotoId);
        Assert.True(result.Value.IsOwn);
        Assert.Equal("Que buen viaje", result.Value.Text);

        var stored = (await _recuerdoRepository.GetByAlbumIdAsync(albumId)).Single();
        Assert.Null(stored.PhotoId);
        Assert.Equal(albumId, stored.AlbumId);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldAllow_ForColaboradorRole()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        const string colaboradorId = "colaborador-1";
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, colaboradorId, "Colaborador", BaulRole.Colaborador, _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.CreateRecuerdoAsync(albumId, "Recuerdo de un colaborador");

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldIncludeAuthorsAvatarUrl_WhenPersonaHasOne()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        const string colaboradorId = "colaborador-1";
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, colaboradorId, "Colaborador", BaulRole.Colaborador, _clock.UtcNow(),
            AvatarPhotoKey: "avatar-key"));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.CreateRecuerdoAsync(albumId, "Recuerdo de un colaborador");

        Assert.True(result.IsSuccess);
        Assert.Equal("https://imgproxy.test/PersonaAvatar/avatar-key", result.Value.UserAvatar);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldDenyAccess_WhenUserHasNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(StrangerId);
        var result = await manager.CreateRecuerdoAsync(albumId, "No debería poder");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldFail_WhenAlbumDoesNotExist()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(Guid.NewGuid(), "texto");

        Assert.True(result.IsFailure);
        Assert.Equal("Album not found", result.Error);
    }

    [Fact]
    public async Task GetRecuerdosAsync_ShouldReturnFeedNewestFirst_WithPhotoThumbnailWhenPresent()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "photo-key", null, null, null, null, CustodioId, _clock.UtcNow()));

        var older = _clock.UtcNow().AddDays(-1);
        var newer = _clock.UtcNow();
        await _recuerdoRepository.CreateAsync(new Recuerdo(Guid.NewGuid(), null, albumId, baulId, CustodioId, "sin foto, más antiguo", older));
        await _recuerdoRepository.CreateAsync(new Recuerdo(Guid.NewGuid(), photoId, albumId, baulId, CustodioId, "con foto, más reciente", newer));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetRecuerdosAsync(albumId);

        Assert.True(result.IsSuccess);
        var list = result.Value.ToList();
        Assert.Equal(["con foto, más reciente", "sin foto, más antiguo"], list.Select(r => r.Text));

        var withPhoto = list.Single(r => r.Text == "con foto, más reciente");
        Assert.Equal(photoId.ToString(), withPhoto.PhotoId);
        Assert.Contains("photo-key", withPhoto.PhotoThumbnailUrl);

        var withoutPhoto = list.Single(r => r.Text == "sin foto, más antiguo");
        Assert.Null(withoutPhoto.PhotoId);
        Assert.Null(withoutPhoto.PhotoThumbnailUrl);
    }

    [Fact]
    public async Task GetRecuerdosAsync_ShouldDenyAccess_WhenUserHasNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(StrangerId);
        var result = await manager.GetRecuerdosAsync(albumId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }
}
