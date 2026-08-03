using ElBaul.Application;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using ElBaul.Tests.Fixtures;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Tests;

public class PersonaManagerTests
{
    private const string CustodioId = BaulFixture.DefaultCustodioId;
    private const string OtherUserId = "user-2";

    private readonly BaulFixture _fixture = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly FakePhotoDateExtractor _photoDateExtractor = new();

    public PersonaManagerTests()
    {
        _fixture.Users.Seed(new User(CustodioId, "custodio@test.com", "Custodio", _fixture.Clock.UtcNow()));
        _fixture.Users.Seed(new User(OtherUserId, "other@test.com", "Other", _fixture.Clock.UtcNow()));
    }

    private PersonaManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(NullLogger<PersonaManager>.Instance, _fixture.Baules, _fixture.Photos, _fixture.Users, _photoStorage,
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), _fixture.Clock, new StaticCurrentUserProvider(currentUserId),
            new BaulAccessService(_fixture.Baules, NullLogger<BaulAccessService>.Instance, _fixture.Photos),
            _fixture.PhotoPersonaTags,
            new PhotoFileService(NullLogger<PhotoFileService>.Instance, _photoStorage, new StaticIdGenerator(Guid.NewGuid()), _photoDateExtractor, new FakePhotoImageNormalizer()),
            new PersonaDtoProjector(_fixture.Photos, _photoStorage));

    [Fact]
    public async Task CreatePersonaAsync_ShouldDenyAccess_WhenCallerIsNotAdmin()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        await _fixture.AddColaboradorAsync(baulId, OtherUserId, "Other");

        var manager = CreateManager(OtherUserId);
        var result = await manager.CreatePersonaAsync(baulId, "Abuela");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task CreatePersonaAsync_ShouldCreatePendingPersona_WithNoUserLinked()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");

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
        var baulId = await _fixture.CreateBaulAsync("Familia");
        const string administradorId = "administrador-1";
        await _fixture.AddAdministradorAsync(baulId, administradorId);

        var manager = CreateManager(administradorId);
        var result = await manager.CreatePersonaAsync(baulId, "Tío Juan");

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task GetPersonaAsync_ShouldDenyAccess_ForNonMemberOfTheBaul()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela");

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetPersonaAsync(baulId, personaId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task GetPersonasAsync_ShouldDenyAccess_ForNonMemberOfTheBaul()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        await _fixture.AddPendingPersonaAsync(baulId, "Abuela");

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetPersonasAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task GetPersonaAsync_ShouldAllowAnyMember_ToViewAnothersFicha()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela");
        await _fixture.AddColaboradorAsync(baulId, OtherUserId, "Other");

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetPersonaAsync(baulId, personaId);

        Assert.True(result.IsSuccess);
        Assert.Equal("Abuela", result.Value.Nickname);
        Assert.False(result.Value.CanEdit);
    }

    [Fact]
    public async Task UpdatePersonaAsync_ShouldDenyAccess_WhenColaboradorEditsSomeoneElsesFicha()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela");
        await _fixture.AddColaboradorAsync(baulId, OtherUserId, "Other");

        var manager = CreateManager(OtherUserId);
        var result = await manager.UpdatePersonaAsync(baulId, personaId, "Abuela María", "Abu");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task UpdatePersonaAsync_ShouldAllow_ForTheLinkedUserEditingTheirOwnFicha()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddColaboradorAsync(baulId, OtherUserId, "Other");

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
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela");

        var manager = CreateManager(CustodioId);
        var result = await manager.UpdatePersonaAsync(baulId, personaId, "Abuela María", "Abu");

        Assert.True(result.IsSuccess);
        Assert.Equal("Abuela María", result.Value.Name);
    }

    [Fact]
    public async Task UpdatePersonaRoleAsync_ShouldNotUpdatePersonaFromAnotherBaul()
    {
        var firstBaulId = await _fixture.CreateBaulAsync("Familia primera");
        var secondBaulId = await _fixture.CreateBaulAsync("Familia segunda");
        var foreignPersonaId = await _fixture.AddColaboradorAsync(secondBaulId, OtherUserId, "Otra");

        var manager = CreateManager(CustodioId);
        var result = await manager.UpdatePersonaRoleAsync(firstBaulId, foreignPersonaId, BaulRole.Administrador);

        Assert.True(result.IsFailure);
        Assert.Equal("Persona not found", result.Error.Message);

        var persona = await _fixture.Baules.GetPersonaByIdAsync(foreignPersonaId);
        Assert.Equal(BaulRole.Colaborador, persona!.Role);
    }

    [Fact]
    public async Task UpdatePersonaBiografiaAsync_ShouldSaveTheBiografia()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela");

        var manager = CreateManager(CustodioId);
        var result = await manager.UpdatePersonaBiografiaAsync(baulId, personaId, "Nació en Asturias en 1945.");

        Assert.True(result.IsSuccess);
        Assert.Equal("Nació en Asturias en 1945.", result.Value.Biografia);
        var persisted = await _fixture.Baules.GetPersonaByIdAsync(personaId);
        Assert.Equal("Nació en Asturias en 1945.", persisted!.Biografia);
    }

    [Fact]
    public async Task UpdatePersonaBiografiaAsync_ShouldAllow_ColaboradorEditingSomeoneElsesFicha()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela");
        await _fixture.AddColaboradorAsync(baulId, OtherUserId, "Other");

        var manager = CreateManager(OtherUserId);
        var result = await manager.UpdatePersonaBiografiaAsync(baulId, personaId, "Nació en Asturias en 1945.");

        Assert.True(result.IsSuccess);
        Assert.Equal("Nació en Asturias en 1945.", result.Value.Biografia);
        var persisted = await _fixture.Baules.GetPersonaByIdAsync(personaId);
        Assert.Equal("Nació en Asturias en 1945.", persisted!.Biografia);
    }

    [Fact]
    public async Task UpdatePersonaBiografiaAsync_ShouldDenyAccess_ForNonMemberOfTheBaul()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela");

        var manager = CreateManager(OtherUserId);
        var result = await manager.UpdatePersonaBiografiaAsync(baulId, personaId, "Intento no autorizado");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task UpdatePersonaAvatarAsync_ShouldCreateLoosePhoto_TagPersona_AndStoreCrop()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela");

        var photoId = Guid.NewGuid();
        var manager = CreateManager(CustodioId, photoId);
        using var content = new MemoryStream([1, 2, 3]);
        var crop = new AvatarCrop(0.25m, 0.75m, 1.8m);
        var result = await manager.UpdatePersonaAvatarAsync(
            baulId, personaId, content, "avatar.jpg", "image/jpeg", crop, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value.AvatarUrl);
        Assert.Equal(photoId.ToString(), result.Value.AvatarPhotoId);
        Assert.Equal(0.25m, result.Value.AvatarCropX);
        Assert.Equal(0.75m, result.Value.AvatarCropY);
        Assert.Equal(1.8m, result.Value.AvatarCropScale);

        var persona = await _fixture.Baules.GetPersonaByIdAsync(personaId);
        Assert.Equal(new PhotoId(photoId), persona!.AvatarPhotoId);
        Assert.Null(persona.AvatarPhotoKey);

        var photo = await _fixture.Photos.GetByIdAsync(new PhotoId(photoId));
        Assert.NotNull(photo);
        Assert.Null(photo!.ChapterId);
        Assert.Contains(personaId, await _fixture.PhotoPersonaTags.GetPersonaIdsByPhotoIdAsync(new PhotoId(photoId)));
    }

    [Fact]
    public async Task SetPersonaAvatarPhotoAsync_ShouldTagExistingPhoto_WhenPersonaWasNotTagged()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela");
        var photoId = await _fixture.AddPhotoAsync(baulId, storageKey: "photo-key");

        var manager = CreateManager(CustodioId);
        var result = await manager.SetPersonaAvatarPhotoAsync(
            baulId, personaId, photoId, new AvatarCrop(0.4m, 0.6m, 2m));

        Assert.True(result.IsSuccess);
        Assert.Equal(photoId.ToString(), result.Value.AvatarPhotoId);
        Assert.Contains(personaId, await _fixture.PhotoPersonaTags.GetPersonaIdsByPhotoIdAsync(photoId));

        var persona = await _fixture.Baules.GetPersonaByIdAsync(personaId);
        Assert.Equal(photoId, persona!.AvatarPhotoId);
    }

    [Fact]
    public async Task SetPersonaAvatarPhotoAsync_ShouldRejectPhotoFromAnotherBaul()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var otherBaulId = await _fixture.CreateBaulAsync("Otra familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela");
        var foreignPhotoId = await _fixture.AddPhotoAsync(otherBaulId, storageKey: "photo-key");

        var manager = CreateManager(CustodioId);
        var result = await manager.SetPersonaAvatarPhotoAsync(
            baulId, personaId, foreignPhotoId, new AvatarCrop(0.5m, 0.5m, 1m));

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error.Message);

        var persona = await _fixture.Baules.GetPersonaByIdAsync(personaId);
        Assert.Null(persona!.AvatarPhotoId);
    }

    [Fact]
    public async Task AcceptPersonalInviteAsync_ShouldLinkCallerToPendingPersona()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela");

        var manager = CreateManager(OtherUserId);
        var result = await manager.AcceptPersonalInviteAsync(personaId);

        Assert.True(result.IsSuccess);
        var persona = await _fixture.Baules.GetPersonaByIdAsync(personaId);
        Assert.Equal(OtherUserId, persona!.UserId);
    }

    [Fact]
    public async Task AcceptPersonalInviteAsync_ShouldBeIdempotent_WhenCallerAlreadyLinked()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddColaboradorAsync(baulId, OtherUserId, "Abuela");

        var manager = CreateManager(OtherUserId);
        var result = await manager.AcceptPersonalInviteAsync(personaId);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task AcceptPersonalInviteAsync_ShouldFail_WhenAlreadyClaimedByAnotherUser()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddColaboradorAsync(baulId, OtherUserId, "Abuela");

        var manager = CreateManager("someone-else");
        var result = await manager.AcceptPersonalInviteAsync(personaId);

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
        var baulId = await _fixture.CreateBaulAsync("Familia"); // seeds a Custodio row for CustodioId
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela");

        // CustodioId already has a Persona row in this baul — accepting a second
        // invitation for the same baul must not attempt a conflicting (BaulId, UserId) update.
        var manager = CreateManager(CustodioId);
        var result = await manager.AcceptPersonalInviteAsync(personaId);

        Assert.True(result.IsFailure);
        Assert.Equal("You already have access to this baúl with a different account link", result.Error.Message);

        var persona = await _fixture.Baules.GetPersonaByIdAsync(personaId);
        Assert.Null(persona!.UserId);
    }

    [Fact]
    public async Task RemovePersonaAsync_ShouldRevokeAccess_WithoutRemovingPersonaOrPhotoTags()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddColaboradorAsync(baulId, OtherUserId, "Abuelo Antonio");
        var photoId = new PhotoId(Guid.NewGuid());
        await _fixture.PhotoPersonaTags.SetTagsAsync(photoId, baulId, [personaId], _fixture.Clock.UtcNow());

        var manager = CreateManager(CustodioId);
        var result = await manager.RemovePersonaAsync(baulId, personaId);

        Assert.True(result.IsSuccess);
        Assert.Contains(personaId, await _fixture.PhotoPersonaTags.GetPersonaIdsByPhotoIdAsync(photoId));

        var persona = await _fixture.Baules.GetPersonaByIdAsync(personaId);
        Assert.NotNull(persona);
        Assert.Null(persona.UserId);
        Assert.Equal(BaulRole.SinAcceso, persona.Role);
    }

    [Fact]
    public async Task RemovePersonaAsync_ShouldRejectCustodio()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var custodioPersona = (await _fixture.Baules.GetPersonaByUserIdAsync(baulId, CustodioId))!;

        var manager = CreateManager(CustodioId);
        var result = await manager.RemovePersonaAsync(baulId, custodioPersona.Id);

        Assert.True(result.IsFailure);
        Assert.Equal("The custodio cannot lose access", result.Error.Message);
    }

    [Fact]
    public async Task AcceptPersonalInviteAsync_ShouldFail_WhenAccessWasRevoked()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela", BaulRole.SinAcceso);

        var manager = CreateManager(OtherUserId);
        var result = await manager.AcceptPersonalInviteAsync(personaId);

        Assert.True(result.IsFailure);
        Assert.Equal("Invitation not found", result.Error.Message);
    }

    [Fact]
    public async Task GetInvitePreviewAsync_ShouldFail_WhenAccessWasRevoked()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela", BaulRole.SinAcceso);

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetInvitePreviewAsync(personaId);

        Assert.True(result.IsFailure);
        Assert.Equal("Invitation not found", result.Error.Message);
    }
}
