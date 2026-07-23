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
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
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
            _recuerdoRepository, _userRepository, _photoStorage,
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), _clock, new StaticCurrentUserProvider(currentUserId));

    // Custodians now have a real SharedUsers row (created by BaulManager.CreateAsync);
    // tests that seed the Baul directly via the repository need to add it themselves.
    private async Task<Baul> SeedBaulAsync(
        Guid baulId, string name, string? description = null, string custodioId = CustodioId,
        DateTime? createdAt = null, DateTime? updatedAt = null)
    {
        var created = createdAt ?? _clock.UtcNow();
        var baul = new Baul(baulId, name, description, custodioId, 0, created, updatedAt ?? created);
        await _baulRepository.CreateAsync(baul);
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, custodioId, "Custodio", BaulRole.Custodio, created));
        return baul;
    }

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
        await SeedBaulAsync(baulId, "Familia");
        var manager = CreateManager(OtherUserId);

        var result = await manager.GetByIdAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldSucceed_ForSharedUser_WithTheirRole()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, OtherUserId, "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetByIdAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.False(result.Value.IsCustodio);
        Assert.Equal("colaborador", result.Value.Role);
    }

    [Fact]
    public async Task CreatePersonaAsync_ShouldDenyAccess_WhenCallerIsNotAdmin()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, OtherUserId, "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.CreatePersonaAsync(baulId, "Abuela");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task CreatePersonaAsync_ShouldCreatePendingPersona_WithNoUserLinked()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");

        var manager = CreateManager(CustodioId);
        var result = await manager.CreatePersonaAsync(baulId, "Abuela");

        Assert.True(result.IsSuccess);
        Assert.Equal("Abuela", result.Value.Nickname);
        Assert.Equal("pending", result.Value.Status);
        Assert.Null(result.Value.UserId);
        Assert.Null(result.Value.Email);
        Assert.Equal("colaborador", result.Value.Role);
    }

    [Fact]
    public async Task CreatePersonaAsync_ShouldAllow_ForAdministradorRole()
    {
        var baulId = Guid.NewGuid();
        const string administradorId = "administrador-1";
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, administradorId, "Administrador", BaulRole.Administrador, _clock.UtcNow()));

        var manager = CreateManager(administradorId);
        var result = await manager.CreatePersonaAsync(baulId, "Tío Juan");

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task GetPersonaAsync_ShouldDenyAccess_ForNonMemberOfTheBaul()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddSharedUserAsync(new SharedUser(personaId, baulId, null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetPersonaAsync(baulId, personaId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task GetPersonaAsync_ShouldAllowAnyMember_ToViewAnothersFicha()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddSharedUserAsync(new SharedUser(personaId, baulId, null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, OtherUserId, "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetPersonaAsync(baulId, personaId);

        Assert.True(result.IsSuccess);
        Assert.Equal("Abuela", result.Value.Nickname);
        Assert.False(result.Value.CanEdit);
    }

    [Fact]
    public async Task UpdatePersonaAsync_ShouldDenyAccess_WhenColaboradorEditsSomeoneElsesFicha()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddSharedUserAsync(new SharedUser(personaId, baulId, null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, OtherUserId, "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.UpdatePersonaAsync(baulId, personaId, "Abuela María", "Abu");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task UpdatePersonaAsync_ShouldAllow_ForTheLinkedUserEditingTheirOwnFicha()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddSharedUserAsync(new SharedUser(personaId, baulId, OtherUserId, "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.UpdatePersonaAsync(baulId, personaId, "Otro Nombre", "Otro");

        Assert.True(result.IsSuccess);
        Assert.Equal("Otro Nombre", result.Value.Name);
        Assert.Equal("Otro", result.Value.Nickname);
        Assert.True(result.Value.CanEdit);
    }

    [Fact]
    public async Task UpdatePersonaAsync_ShouldAllow_ForAdminEditingAPersonaWithNoLinkedUser()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddSharedUserAsync(new SharedUser(personaId, baulId, null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.UpdatePersonaAsync(baulId, personaId, "Abuela María", "Abu");

        Assert.True(result.IsSuccess);
        Assert.Equal("Abuela María", result.Value.Name);
    }

    [Fact]
    public async Task UpdatePersonaAvatarAsync_ShouldSwapStorageKey_AndDeleteThePreviousOne()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            personaId, baulId, null, "Abuela", BaulRole.Colaborador, _clock.UtcNow(), AvatarPhotoKey: "personas/old-key"));

        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UpdatePersonaAvatarAsync(baulId, personaId, content, "avatar.jpg", "image/jpeg");

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value.AvatarUrl);
        Assert.Contains("personas/old-key", _photoStorage.DeletedKeys);

        var persona = await _baulRepository.GetSharedUserByIdAsync(personaId);
        Assert.NotEqual("personas/old-key", persona!.AvatarPhotoKey);
    }

    [Fact]
    public async Task CreateRemovalRequestAsync_ShouldUsePersonaNickname_ForTheRequesterName()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", 1, "key", _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "key", null, null, null, CustodioId, _clock.UtcNow()));
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, OtherUserId, "Tita Solicitudes", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.CreateRemovalRequestAsync(baulId, photoId, "no me gusta");

        Assert.True(result.IsSuccess);
        Assert.Equal("Tita Solicitudes", result.Value.RequesterName);
    }

    [Fact]
    public async Task ApproveRemovalRequestAsync_ShouldDeletePhoto_AndDecrementAlbumPhotoCount()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        var photoId = Guid.NewGuid();

        await SeedBaulAsync(baulId, "Familia");
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Album", 1, "key", _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "key", null, null, null, CustodioId, _clock.UtcNow()));

        var requestId = Guid.NewGuid();
        await _baulRepository.CreateRemovalRequestAsync(new RemovalRequest(
            requestId, baulId, photoId, "key", "Requester", "req@test.com", null, _clock.UtcNow(), RequestStatus.Pending));

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
        await SeedBaulAsync(baulId, "Familia");

        var requestId = Guid.NewGuid();
        await _baulRepository.CreateRemovalRequestAsync(new RemovalRequest(
            requestId, baulId, photoId, "key", "Requester", "req@test.com", null, _clock.UtcNow(), RequestStatus.Pending));

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
        await SeedBaulAsync(baulId, "Familia");
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "photo-key", null, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(baulId, photoId);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value.CoverPhotoUrl);

        var baul = await _baulRepository.GetByIdAsync(baulId);
        Assert.Equal("photo-key", baul!.CoverPhotoKey);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldDenyAccess_WhenCallerIsNotAdmin()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "photo-key", null, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.SetCoverAsync(baulId, photoId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldFail_WhenPhotoDoesNotExist()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");

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
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.CreateAsync(new Baul(otherBaulId, "Otro", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, otherBaulId, "photo-key", null, null, null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(baulId, photoId);

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error);
    }

    [Fact]
    public async Task UpdateAsync_ShouldUpdateNameAndDescription_ForCustodio()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia", "desc vieja");

        var manager = CreateManager(CustodioId);
        var result = await manager.UpdateAsync(baulId, "Familia 2024", "desc nueva");

        Assert.True(result.IsSuccess);
        Assert.Equal("Familia 2024", result.Value.Name);
        Assert.Equal("desc nueva", result.Value.Description);

        var baul = await _baulRepository.GetByIdAsync(baulId);
        Assert.Equal("Familia 2024", baul!.Name);
        Assert.Equal("desc nueva", baul.Description);
    }

    [Fact]
    public async Task UpdateAsync_ShouldDenyAccess_WhenCallerIsNotAdmin()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, OtherUserId, "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.UpdateAsync(baulId, "Familia 2024", null);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task UpdateAsync_ShouldFail_WhenBaulDoesNotExist()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.UpdateAsync(Guid.NewGuid(), "Familia 2024", null);

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error);
    }

    [Fact]
    public async Task AcceptPersonalInviteAsync_ShouldLinkCallerToPendingPersona()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddSharedUserAsync(new SharedUser(personaId, baulId, null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.AcceptPersonalInviteAsync(personaId);

        Assert.True(result.IsSuccess);
        var persona = await _baulRepository.GetSharedUserByIdAsync(personaId);
        Assert.Equal(OtherUserId, persona!.UserId);
    }

    [Fact]
    public async Task AcceptPersonalInviteAsync_ShouldBeIdempotent_WhenCallerAlreadyLinked()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddSharedUserAsync(new SharedUser(personaId, baulId, OtherUserId, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.AcceptPersonalInviteAsync(personaId);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task AcceptPersonalInviteAsync_ShouldFail_WhenAlreadyClaimedByAnotherUser()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddSharedUserAsync(new SharedUser(personaId, baulId, OtherUserId, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager("someone-else");
        var result = await manager.AcceptPersonalInviteAsync(personaId);

        Assert.True(result.IsFailure);
        Assert.Equal("This invitation has already been used", result.Error);
    }

    [Fact]
    public async Task AcceptPersonalInviteAsync_ShouldFail_WhenInvitationDoesNotExist()
    {
        var manager = CreateManager(OtherUserId);
        var result = await manager.AcceptPersonalInviteAsync(Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("Invitation not found", result.Error);
    }

    [Fact]
    public async Task AcceptPersonalInviteAsync_ShouldFail_WhenCallerAlreadyHasAccessToTheBaul()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia"); // seeds a Custodio row for CustodioId
        var personaId = Guid.NewGuid();
        await _baulRepository.AddSharedUserAsync(new SharedUser(personaId, baulId, null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

        // CustodioId already has a SharedUser row in this baul — accepting a second
        // invitation for the same baul must not attempt a conflicting (BaulId, UserId) update.
        var manager = CreateManager(CustodioId);
        var result = await manager.AcceptPersonalInviteAsync(personaId);

        Assert.True(result.IsFailure);
        Assert.Equal("You already have access to this baúl with a different account link", result.Error);

        var persona = await _baulRepository.GetSharedUserByIdAsync(personaId);
        Assert.Null(persona!.UserId);
    }

    [Fact]
    public async Task GetAllForCurrentUserAsync_ShouldIncludeCustodio_InMemberCount_ForOwnedBaul()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, OtherUserId, "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetAllForCurrentUserAsync();

        Assert.True(result.IsSuccess);
        var dto = result.Value.Single();
        Assert.Equal(2, dto.MemberCount); // custodio + 1 shared user
    }

    [Fact]
    public async Task GetAllForCurrentUserAsync_ShouldReturnCorrectMemberCount_ForBaulSharedWithCaller()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, OtherUserId, "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetAllForCurrentUserAsync();

        Assert.True(result.IsSuccess);
        var dto = result.Value.Single();
        Assert.Equal(2, dto.MemberCount); // custodio + the caller themself
    }

    [Fact]
    public async Task GetAllForCurrentUserAsync_ShouldSortByUpdatedAt_MostRecentFirst()
    {
        var olderBaulId = Guid.NewGuid();
        var newerBaulId = Guid.NewGuid();
        var older = _clock.UtcNow().AddDays(-2);
        var newer = _clock.UtcNow();
        await SeedBaulAsync(olderBaulId, "Antiguo", createdAt: older, updatedAt: older);
        await SeedBaulAsync(newerBaulId, "Reciente", createdAt: newer, updatedAt: newer);

        var manager = CreateManager(CustodioId);
        var result = await manager.GetAllForCurrentUserAsync();

        Assert.True(result.IsSuccess);
        var ids = result.Value.Select(d => d.Id).ToList();
        Assert.Equal([newerBaulId.ToString(), olderBaulId.ToString()], ids);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldIncludeCustodio_InMemberCount_ForNonCustodioCaller()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, OtherUserId, "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetByIdAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.MemberCount);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldCreateStandaloneRecuerdo_WithNoPhotoOrAlbum()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(baulId, "Un recuerdo suelto");

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.PhotoId);
        Assert.Null(result.Value.AlbumId);
        Assert.True(result.Value.IsOwn);

        var stored = (await _recuerdoRepository.GetByBaulIdAsync(baulId)).Single();
        Assert.Equal(baulId, stored.BaulId);
        Assert.Null(stored.PhotoId);
        Assert.Null(stored.AlbumId);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldSucceed_ForSharedUserWithAccess()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, OtherUserId, "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.CreateRecuerdoAsync(baulId, "Recuerdo de un miembro");

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldFail_WhenBaulNotFound()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(Guid.NewGuid(), "texto");

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldFail_WhenCallerHasNoAccess()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");

        var manager = CreateManager(OtherUserId);
        var result = await manager.CreateRecuerdoAsync(baulId, "texto");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task GetRecuerdosAsync_ShouldReturnMixedFeed_NewestFirst_WithProvenance()
    {
        var baulId = Guid.NewGuid();
        var albumId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _albumRepository.CreateAsync(new Album(albumId, baulId, "Vacaciones", 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(new Photo(photoId, albumId, baulId, "photo-key", null, null, null, CustodioId, _clock.UtcNow()));

        var oldest = _clock.UtcNow().AddDays(-2);
        var middle = _clock.UtcNow().AddDays(-1);
        var newest = _clock.UtcNow();
        await _recuerdoRepository.CreateAsync(new Recuerdo(Guid.NewGuid(), null, null, baulId, CustodioId, "suelto", oldest));
        await _recuerdoRepository.CreateAsync(new Recuerdo(Guid.NewGuid(), null, albumId, baulId, CustodioId, "de capítulo", middle));
        await _recuerdoRepository.CreateAsync(new Recuerdo(Guid.NewGuid(), photoId, albumId, baulId, CustodioId, "de foto", newest));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetRecuerdosAsync(baulId);

        Assert.True(result.IsSuccess);
        var list = result.Value.ToList();
        Assert.Equal(["de foto", "de capítulo", "suelto"], list.Select(r => r.Text));

        var photoRecuerdo = list.Single(r => r.Text == "de foto");
        Assert.Equal(photoId.ToString(), photoRecuerdo.PhotoId);
        Assert.NotNull(photoRecuerdo.PhotoThumbnailUrl);

        var albumRecuerdo = list.Single(r => r.Text == "de capítulo");
        Assert.Null(albumRecuerdo.PhotoId);
        Assert.Equal(albumId.ToString(), albumRecuerdo.AlbumId);
        Assert.Equal("Vacaciones", albumRecuerdo.AlbumName);

        var standaloneRecuerdo = list.Single(r => r.Text == "suelto");
        Assert.Null(standaloneRecuerdo.PhotoId);
        Assert.Null(standaloneRecuerdo.AlbumId);
    }

    [Fact]
    public async Task GetRecuerdosAsync_ShouldFail_WhenBaulNotFound()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.GetRecuerdosAsync(Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error);
    }

    [Fact]
    public async Task GetRecuerdosAsync_ShouldFail_WhenCallerHasNoAccess()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetRecuerdosAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }
}
