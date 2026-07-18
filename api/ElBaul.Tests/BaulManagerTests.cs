using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Tests;

public class BaulManagerTests
{
    private const string CustodioId = "custodio-1";
    private const string OtherUserId = "user-2";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryAlbumRepository _albumRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryUserRepository _userRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();

    public BaulManagerTests()
    {
        _userRepository.Seed(new User(CustodioId, "custodio@test.com", "Custodio", _clock.UtcNow()));
        _userRepository.Seed(new User(OtherUserId, "other@test.com", "Other", _clock.UtcNow()));
    }

    private BaulManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(NullLogger<BaulManager>.Instance, _baulRepository, _albumRepository, _photoRepository,
            _userRepository, _photoStorage,
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), _clock, new StaticCurrentUserProvider(currentUserId));

    [Fact]
    public async Task CreateAsync_ShouldCreateBaulOwnedByCurrentUser()
    {
        var manager = CreateManager(CustodioId);

        var result = await manager.CreateAsync("Familia", "desc");

        Assert.True(result.IsSuccess);
        Assert.Equal("Familia", result.Value.Name);
        Assert.True(result.Value.IsCustodio);
        Assert.Equal("custodio", result.Value.Role);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldFail_WhenBaulDoesNotExist()
    {
        var manager = CreateManager(CustodioId);

        var result = await manager.GetByIdAsync(Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldDenyAccess_WhenUserHasNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        var manager = CreateManager(OtherUserId);

        var result = await manager.GetByIdAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldSucceed_ForSharedUser_WithTheirRole()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, OtherUserId, "other@test.com", BaulRole.Colaborador, SharedUserStatus.Active, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetByIdAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.False(result.Value.IsCustodio);
        Assert.Equal("colaborador", result.Value.Role);
    }

    [Fact]
    public async Task ShareAsync_ShouldDenyAccess_WhenCallerIsNotCustodio()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.ShareAsync(baulId, "invited@test.com", "miembro");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task ShareAsync_ShouldMarkPending_WhenInvitedUserDoesNotExistYet()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.ShareAsync(baulId, "unregistered@test.com", "miembro");

        Assert.True(result.IsSuccess);
        Assert.Equal("pending", result.Value.Status);
        Assert.Null(result.Value.UserId);
    }

    [Fact]
    public async Task ShareAsync_ShouldMarkActive_WhenInvitedUserAlreadyExists()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.ShareAsync(baulId, "other@test.com", "miembro");

        Assert.True(result.IsSuccess);
        Assert.Equal("active", result.Value.Status);
        Assert.Equal(OtherUserId, result.Value.UserId);
    }

    [Fact]
    public async Task ShareAsync_ShouldFail_ForInvalidRole()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.ShareAsync(baulId, "other@test.com", "not-a-role");

        Assert.True(result.IsFailure);
        Assert.Equal("Invalid role", result.Error);
    }

    [Fact]
    public async Task ApproveRemovalRequestAsync_ShouldDeletePhoto_AndDecrementAlbumPhotoCount()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        var photoId = Guid.NewGuid();

        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", null, 1, "key", _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "key", null, null, null, null, CustodioId, _clock.UtcNow()));

        var requestId = Guid.NewGuid();
        await _baulRepository.CreateRemovalRequestAsync(new RemovalRequest(
            requestId, baulId, photoId, "key", null, "Requester", "req@test.com", null, _clock.UtcNow(), RequestStatus.Pending));

        var manager = CreateManager(CustodioId);
        var result = await manager.ApproveRemovalRequestAsync(baulId, requestId);

        Assert.True(result.IsSuccess);
        Assert.Null(await _photoRepository.GetByIdAsync(photoId));

        var album = await _albumRepository.GetByIdAsync(albumId);
        Assert.Equal(0, album!.PhotoCount);
    }

    [Fact]
    public async Task RejectRemovalRequestAsync_ShouldKeepPhoto_AndClearTheRequest()
    {
        var baulId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));

        var requestId = Guid.NewGuid();
        await _baulRepository.CreateRemovalRequestAsync(new RemovalRequest(
            requestId, baulId, photoId, "key", null, "Requester", "req@test.com", null, _clock.UtcNow(), RequestStatus.Pending));

        var manager = CreateManager(CustodioId);
        var result = await manager.RejectRemovalRequestAsync(baulId, requestId);

        Assert.True(result.IsSuccess);
        Assert.Null(await _baulRepository.GetRemovalRequestAsync(baulId, requestId));
    }

    [Fact]
    public async Task SetCoverAsync_ShouldSetCoverPhotoKey_ForCustodio()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "photo-key", null, null, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(baulId, photoId);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value.CoverPhotoUrl);

        var baul = await _baulRepository.GetByIdAsync(baulId);
        Assert.Equal("photo-key", baul!.CoverPhotoKey);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldDenyAccess_WhenCallerIsNotCustodio()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "photo-key", null, null, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.SetCoverAsync(baulId, photoId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldFail_WhenPhotoDoesNotExist()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(baulId, Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldFail_WhenPhotoBelongsToDifferentBaul()
    {
        var baulId = Guid.NewGuid();
        var otherBaulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.CreateAsync(new Baul(otherBaulId, "Otro", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, otherBaulId, "photo-key", null, null, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(baulId, photoId);

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error);
    }

    [Fact]
    public async Task AcceptInviteAsync_ShouldAddCallerAsMiembro_WhenNotAlreadyShared()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.AcceptInviteAsync(baulId);

        Assert.True(result.IsSuccess);
        var access = await _baulRepository.GetSharedUserByUserIdAsync(baulId, OtherUserId);
        Assert.NotNull(access);
        Assert.Equal(BaulRole.Miembro, access!.Role);
    }

    [Fact]
    public async Task AcceptInviteAsync_ShouldBeANoOp_ForTheCustodio()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.AcceptInviteAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Null(await _baulRepository.GetSharedUserByUserIdAsync(baulId, CustodioId));
    }
}
