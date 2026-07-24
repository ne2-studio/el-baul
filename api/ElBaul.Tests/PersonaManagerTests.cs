using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Tests;

public class PersonaManagerTests
{
    private const string CustodioId = "custodio-1";
    private const string OtherUserId = "user-2";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryUserRepository _userRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();

    public PersonaManagerTests()
    {
        _userRepository.Seed(new User(CustodioId, "custodio@test.com", "Custodio", _clock.UtcNow()));
        _userRepository.Seed(new User(OtherUserId, "other@test.com", "Other", _clock.UtcNow()));
    }

    private PersonaManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(NullLogger<PersonaManager>.Instance, _baulRepository, _photoRepository, _userRepository, _photoStorage,
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), _clock, new StaticCurrentUserProvider(currentUserId),
            new BaulAccessService(_baulRepository));

    // Custodians now have a real Personas row (created by BaulManager.CreateAsync);
    // tests that seed the Baul directly via the repository need to add it themselves.
    private async Task<Baul> SeedBaulAsync(
        Guid baulId, string name, string? description = null, string custodioId = CustodioId,
        DateTime? createdAt = null, DateTime? updatedAt = null)
    {
        var created = createdAt ?? _clock.UtcNow();
        var baul = new Baul(new BaulId(baulId), name, description, custodioId, 0, created, updatedAt ?? created);
        await _baulRepository.CreateAsync(baul);
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), custodioId, "Custodio", BaulRole.Custodio, created));
        return baul;
    }

    [Fact]
    public async Task CreatePersonaAsync_ShouldDenyAccess_WhenCallerIsNotAdmin()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), OtherUserId, "Other", BaulRole.Colaborador, _clock.UtcNow()));

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
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), administradorId, "Administrador", BaulRole.Administrador, _clock.UtcNow()));

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
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

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
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), OtherUserId, "Other", BaulRole.Colaborador, _clock.UtcNow()));

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
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), OtherUserId, "Other", BaulRole.Colaborador, _clock.UtcNow()));

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
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), OtherUserId, "Other", BaulRole.Colaborador, _clock.UtcNow()));

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
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

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
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuela", BaulRole.Colaborador, _clock.UtcNow(), AvatarPhotoKey: "personas/old-key"));

        var manager = CreateManager(CustodioId);
        using var content = new MemoryStream([1, 2, 3]);
        var result = await manager.UpdatePersonaAvatarAsync(baulId, personaId, content, "avatar.jpg", "image/jpeg");

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value.AvatarUrl);
        Assert.Contains("personas/old-key", _photoStorage.DeletedKeys);

        var persona = await _baulRepository.GetPersonaByIdAsync(new PersonaId(personaId));
        Assert.NotEqual("personas/old-key", persona!.AvatarPhotoKey);
    }

    [Fact]
    public async Task AcceptPersonalInviteAsync_ShouldLinkCallerToPendingPersona()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.AcceptPersonalInviteAsync(personaId);

        Assert.True(result.IsSuccess);
        var persona = await _baulRepository.GetPersonaByIdAsync(new PersonaId(personaId));
        Assert.Equal(OtherUserId, persona!.UserId);
    }

    [Fact]
    public async Task AcceptPersonalInviteAsync_ShouldBeIdempotent_WhenCallerAlreadyLinked()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), OtherUserId, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

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
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), OtherUserId, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

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
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

        // CustodioId already has a Persona row in this baul — accepting a second
        // invitation for the same baul must not attempt a conflicting (BaulId, UserId) update.
        var manager = CreateManager(CustodioId);
        var result = await manager.AcceptPersonalInviteAsync(personaId);

        Assert.True(result.IsFailure);
        Assert.Equal("You already have access to this baúl with a different account link", result.Error);

        var persona = await _baulRepository.GetPersonaByIdAsync(new PersonaId(personaId));
        Assert.Null(persona!.UserId);
    }
}
