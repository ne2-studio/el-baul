using ElBaul.Application;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using ElBaul.Infra.Lite;
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
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();
    private readonly InMemoryPhotoPersonaTagRepository _photoPersonaTagRepository = new();
    private readonly FakePhotoDateExtractor _photoDateExtractor = new();

    public PersonaManagerTests()
    {
        _userRepository.Seed(new User(CustodioId, "custodio@test.com", "Custodio", _clock.UtcNow()));
        _userRepository.Seed(new User(OtherUserId, "other@test.com", "Other", _clock.UtcNow()));
    }

    private PersonaManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(NullLogger<PersonaManager>.Instance, _baulRepository, _photoRepository, _userRepository, _photoStorage,
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), _clock, new StaticCurrentUserProvider(currentUserId),
            new BaulAccessService(_baulRepository, NullLogger<BaulAccessService>.Instance, _photoRepository),
            _photoPersonaTagRepository,
            new PhotoFileService(NullLogger<PhotoFileService>.Instance, _photoStorage, new StaticIdGenerator(Guid.NewGuid()), _photoDateExtractor));

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
        var result = await manager.CreatePersonaAsync(new BaulId(baulId), "Abuela");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task CreatePersonaAsync_ShouldCreatePendingPersona_WithNoUserLinked()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");

        var manager = CreateManager(CustodioId);
        var result = await manager.CreatePersonaAsync(new BaulId(baulId), "Abuela");

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
        var result = await manager.CreatePersonaAsync(new BaulId(baulId), "Tío Juan");

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
        var result = await manager.GetPersonaAsync(new BaulId(baulId), new PersonaId(personaId));

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task GetPersonasAsync_ShouldDenyAccess_ForNonMemberOfTheBaul()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetPersonasAsync(new BaulId(baulId));

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
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
        var result = await manager.GetPersonaAsync(new BaulId(baulId), new PersonaId(personaId));

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
        var result = await manager.UpdatePersonaAsync(new BaulId(baulId), new PersonaId(personaId), "Abuela María", "Abu");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task UpdatePersonaAsync_ShouldAllow_ForTheLinkedUserEditingTheirOwnFicha()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), OtherUserId, "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.UpdatePersonaAsync(new BaulId(baulId), new PersonaId(personaId), "Otro Nombre", "Otro");

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
        var result = await manager.UpdatePersonaAsync(new BaulId(baulId), new PersonaId(personaId), "Abuela María", "Abu");

        Assert.True(result.IsSuccess);
        Assert.Equal("Abuela María", result.Value.Name);
    }

    [Fact]
    public async Task UpdatePersonaRoleAsync_ShouldNotUpdatePersonaFromAnotherBaul()
    {
        var firstBaulId = Guid.NewGuid();
        var secondBaulId = Guid.NewGuid();
        await SeedBaulAsync(firstBaulId, "Familia primera");
        await SeedBaulAsync(secondBaulId, "Familia segunda");
        var foreignPersonaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(
            new PersonaId(foreignPersonaId), new BaulId(secondBaulId), OtherUserId, "Otra", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.UpdatePersonaRoleAsync(
            new BaulId(firstBaulId), new PersonaId(foreignPersonaId), BaulRole.Administrador);

        Assert.True(result.IsFailure);
        Assert.Equal("Persona not found", result.Error.Message);

        var persona = await _baulRepository.GetPersonaByIdAsync(new PersonaId(foreignPersonaId));
        Assert.Equal(BaulRole.Colaborador, persona!.Role);
    }

    [Fact]
    public async Task UpdatePersonaBiografiaAsync_ShouldSaveTheBiografia()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.UpdatePersonaBiografiaAsync(new BaulId(baulId), new PersonaId(personaId), "Nació en Asturias en 1945.");

        Assert.True(result.IsSuccess);
        Assert.Equal("Nació en Asturias en 1945.", result.Value.Biografia);
        var persisted = await _baulRepository.GetPersonaByIdAsync(new PersonaId(personaId));
        Assert.Equal("Nació en Asturias en 1945.", persisted!.Biografia);
    }

    [Fact]
    public async Task UpdatePersonaBiografiaAsync_ShouldAllow_ColaboradorEditingSomeoneElsesFicha()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), OtherUserId, "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.UpdatePersonaBiografiaAsync(new BaulId(baulId), new PersonaId(personaId), "Nació en Asturias en 1945.");

        Assert.True(result.IsSuccess);
        Assert.Equal("Nació en Asturias en 1945.", result.Value.Biografia);
        var persisted = await _baulRepository.GetPersonaByIdAsync(new PersonaId(personaId));
        Assert.Equal("Nació en Asturias en 1945.", persisted!.Biografia);
    }

    [Fact]
    public async Task UpdatePersonaBiografiaAsync_ShouldDenyAccess_ForNonMemberOfTheBaul()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.UpdatePersonaBiografiaAsync(new BaulId(baulId), new PersonaId(personaId), "Intento no autorizado");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task UpdatePersonaAvatarAsync_ShouldCreateLoosePhoto_TagPersona_AndStoreCrop()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

        var photoId = Guid.NewGuid();
        var manager = CreateManager(CustodioId, photoId);
        using var content = new MemoryStream([1, 2, 3]);
        var crop = new AvatarCrop(0.25m, 0.75m, 1.8m);
        var result = await manager.UpdatePersonaAvatarAsync(
            new BaulId(baulId), new PersonaId(personaId), content, "avatar.jpg", "image/jpeg", crop, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value.AvatarUrl);
        Assert.Equal(photoId.ToString(), result.Value.AvatarPhotoId);
        Assert.Equal(0.25m, result.Value.AvatarCropX);
        Assert.Equal(0.75m, result.Value.AvatarCropY);
        Assert.Equal(1.8m, result.Value.AvatarCropScale);

        var persona = await _baulRepository.GetPersonaByIdAsync(new PersonaId(personaId));
        Assert.Equal(new PhotoId(photoId), persona!.AvatarPhotoId);
        Assert.Null(persona.AvatarPhotoKey);

        var photo = await _photoRepository.GetByIdAsync(new PhotoId(photoId));
        Assert.NotNull(photo);
        Assert.Null(photo!.ChapterId);
        Assert.Contains(new PersonaId(personaId), await _photoPersonaTagRepository.GetPersonaIdsByPhotoIdAsync(new PhotoId(photoId)));
    }

    [Fact]
    public async Task SetPersonaAvatarPhotoAsync_ShouldTagExistingPhoto_WhenPersonaWasNotTagged()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), null, new BaulId(baulId), "photo-key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetPersonaAvatarPhotoAsync(
            new BaulId(baulId), new PersonaId(personaId), new PhotoId(photoId), new AvatarCrop(0.4m, 0.6m, 2m));

        Assert.True(result.IsSuccess);
        Assert.Equal(photoId.ToString(), result.Value.AvatarPhotoId);
        Assert.Contains(new PersonaId(personaId), await _photoPersonaTagRepository.GetPersonaIdsByPhotoIdAsync(new PhotoId(photoId)));

        var persona = await _baulRepository.GetPersonaByIdAsync(new PersonaId(personaId));
        Assert.Equal(new PhotoId(photoId), persona!.AvatarPhotoId);
    }

    [Fact]
    public async Task SetPersonaAvatarPhotoAsync_ShouldRejectPhotoFromAnotherBaul()
    {
        var baulId = Guid.NewGuid();
        var otherBaulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await SeedBaulAsync(otherBaulId, "Otra familia");
        var personaId = Guid.NewGuid();
        var foreignPhotoId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(foreignPhotoId), null, new BaulId(otherBaulId), "photo-key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetPersonaAvatarPhotoAsync(
            new BaulId(baulId), new PersonaId(personaId), new PhotoId(foreignPhotoId), new AvatarCrop(0.5m, 0.5m, 1m));

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error.Message);

        var persona = await _baulRepository.GetPersonaByIdAsync(new PersonaId(personaId));
        Assert.Null(persona!.AvatarPhotoId);
    }

    [Fact]
    public async Task AcceptPersonalInviteAsync_ShouldLinkCallerToPendingPersona()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuela", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.AcceptPersonalInviteAsync(new PersonaId(personaId));

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
        var result = await manager.AcceptPersonalInviteAsync(new PersonaId(personaId));

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
        var result = await manager.AcceptPersonalInviteAsync(new PersonaId(personaId));

        Assert.True(result.IsFailure);
        Assert.Equal("This invitation has already been used", result.Error.Message);
    }

    [Fact]
    public async Task AcceptPersonalInviteAsync_ShouldFail_WhenInvitationDoesNotExist()
    {
        var manager = CreateManager(OtherUserId);
        var result = await manager.AcceptPersonalInviteAsync(new PersonaId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal("Invitation not found", result.Error.Message);
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
        var result = await manager.AcceptPersonalInviteAsync(new PersonaId(personaId));

        Assert.True(result.IsFailure);
        Assert.Equal("You already have access to this baúl with a different account link", result.Error.Message);

        var persona = await _baulRepository.GetPersonaByIdAsync(new PersonaId(personaId));
        Assert.Null(persona!.UserId);
    }

    [Fact]
    public async Task RemovePersonaAsync_ShouldRevokeAccess_WithoutRemovingPersonaOrPhotoTags()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), OtherUserId, "Abuelo Antonio", BaulRole.Colaborador, _clock.UtcNow()));
        var photoId = Guid.NewGuid();
        await _photoPersonaTagRepository.SetTagsAsync(new PhotoId(photoId), new BaulId(baulId), [new PersonaId(personaId)], _clock.UtcNow());

        var manager = CreateManager(CustodioId);
        var result = await manager.RemovePersonaAsync(new BaulId(baulId), new PersonaId(personaId));

        Assert.True(result.IsSuccess);
        Assert.Contains(new PersonaId(personaId), await _photoPersonaTagRepository.GetPersonaIdsByPhotoIdAsync(new PhotoId(photoId)));

        var persona = await _baulRepository.GetPersonaByIdAsync(new PersonaId(personaId));
        Assert.NotNull(persona);
        Assert.Null(persona.UserId);
        Assert.Equal(BaulRole.SinAcceso, persona.Role);
    }

    [Fact]
    public async Task RemovePersonaAsync_ShouldRejectCustodio()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var custodioPersona = (await _baulRepository.GetPersonaByUserIdAsync(new BaulId(baulId), CustodioId))!;

        var manager = CreateManager(CustodioId);
        var result = await manager.RemovePersonaAsync(new BaulId(baulId), custodioPersona.Id);

        Assert.True(result.IsFailure);
        Assert.Equal("The custodio cannot lose access", result.Error.Message);
    }

    [Fact]
    public async Task AcceptPersonalInviteAsync_ShouldFail_WhenAccessWasRevoked()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuela", BaulRole.SinAcceso, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.AcceptPersonalInviteAsync(new PersonaId(personaId));

        Assert.True(result.IsFailure);
        Assert.Equal("Invitation not found", result.Error.Message);
    }

    [Fact]
    public async Task GetInvitePreviewAsync_ShouldFail_WhenAccessWasRevoked()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var personaId = Guid.NewGuid();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(personaId), new BaulId(baulId), null, "Abuela", BaulRole.SinAcceso, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetInvitePreviewAsync(new PersonaId(personaId));

        Assert.True(result.IsFailure);
        Assert.Equal("Invitation not found", result.Error.Message);
    }
}
