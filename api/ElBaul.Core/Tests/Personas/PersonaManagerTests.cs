using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Personas.Application;
using ElBaul.Core.Photos.Application;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Users.OutputPorts;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using ElBaul.Tests.Fixtures;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
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
        _fixture.Users.Seed(new User(new UserId(CustodioId), "custodio@test.com", "Custodio", null, _fixture.Clock.UtcNow()));
        _fixture.Users.Seed(new User(new UserId(OtherUserId), "other@test.com", "Other", null, _fixture.Clock.UtcNow()));
    }

    private PersonaManager CreateManager(string currentUserId, Guid? nextId = null, bool biografiaEnabled = true) =>
        new(NullLogger<PersonaManager>.Instance, _fixture.BaulPhotoCoverListener, _fixture.Personas, _fixture.Photos, _fixture.Users,
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), _fixture.Clock, new StaticCurrentUserProvider(currentUserId),
            new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            _fixture.PhotoPersonaTags,
            new PhotoUploadWorkflow(
                NullLogger<PhotoUploadWorkflow>.Instance, _fixture.Photos,
                new PhotoFileService(NullLogger<PhotoFileService>.Instance, _photoStorage, new StaticIdGenerator(Guid.NewGuid()), _photoDateExtractor,
                    new FakePhotoImageNormalizer(), new FakeImageProcessor(), new ImagePolicy()),
                new StaticIdGenerator(nextId ?? Guid.NewGuid()), _fixture.Clock, new FakeUnitOfWork()),
            new PersonaDtoProjector(_fixture.Photos, _photoStorage, _fixture.Users), new FakeUnitOfWork(),
            new StaticAppConfiguration(biografiaEnabled: biografiaEnabled));

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
    public async Task CreatePersonaAsync_ShouldCreateWithTheRequestedRole()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");

        var manager = CreateManager(CustodioId);
        var result = await manager.CreatePersonaAsync(baulId, "Tío sin acceso", BaulRole.SinAcceso);

        Assert.True(result.IsSuccess);
        Assert.Equal("sin_acceso", result.Value.Role);
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
    public async Task GetPersonasAsync_ShouldResolveEachPersonasUserAndAvatar_Independently()
    {
        // Targets GetPersonasAsync's batched user/avatar lookups specifically: a claimed
        // persona with an avatar photo, an unclaimed one, and the custodio must each get their
        // own data back — the exact mistake a broken dictionary lookup in the batching would
        // produce is one persona's user/avatar leaking onto another's DTO.
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var avatarPhotoId = await _fixture.AddPhotoAsync(baulId, storageKey: "avatar-key");
        await _fixture.Personas.AddPersonaAsync(new Persona(
            new PersonaId(Guid.NewGuid()), baulId, new UserId(OtherUserId), "Colaborador con avatar", BaulRole.Colaborador,
            _fixture.Clock.UtcNow(), AvatarPhotoId: avatarPhotoId));
        await _fixture.AddPendingPersonaAsync(baulId, "Pendiente sin cuenta");

        var manager = CreateManager(CustodioId);
        var result = await manager.GetPersonasAsync(baulId);

        Assert.True(result.IsSuccess);
        var dtos = result.Value.ToList();
        Assert.Equal(3, dtos.Count);

        var withAvatar = dtos.Single(d => d.Nickname == "Colaborador con avatar");
        Assert.Equal("other@test.com", withAvatar.Email);
        Assert.Contains("avatar-key", withAvatar.AvatarUrl);

        var pending = dtos.Single(d => d.Nickname == "Pendiente sin cuenta");
        Assert.Null(pending.Email);
        Assert.Null(pending.AvatarUrl);

        var custodio = dtos.Single(d => d.Nickname == "Custodio");
        Assert.Equal("custodio@test.com", custodio.Email);
        Assert.Null(custodio.AvatarUrl);
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

        var persona = await _fixture.Personas.GetPersonaByIdAsync(foreignPersonaId);
        Assert.Equal(BaulRole.Colaborador, persona!.Role);
    }

    [Fact]
    public async Task UpdatePersonaRoleAsync_ShouldRejectSinAcceso_ForAnActivePersona()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddColaboradorAsync(baulId, OtherUserId, "Other");

        var manager = CreateManager(CustodioId);
        var result = await manager.UpdatePersonaRoleAsync(baulId, personaId, BaulRole.SinAcceso);

        Assert.True(result.IsFailure);
        Assert.Equal("Cannot remove access from a persona who already joined", result.Error.Message);

        var persona = await _fixture.Personas.GetPersonaByIdAsync(personaId);
        Assert.Equal(BaulRole.Colaborador, persona!.Role);
    }

    [Fact]
    public async Task UpdatePersonaRoleAsync_ShouldAllowSinAcceso_ForAPendingPersona()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela");

        var manager = CreateManager(CustodioId);
        var result = await manager.UpdatePersonaRoleAsync(baulId, personaId, BaulRole.SinAcceso);

        Assert.True(result.IsSuccess);
        Assert.Equal("sin_acceso", result.Value.Role);
    }

    // There used to be a test here for rejecting BaulRole.Custodio as a grantable role — now
    // impossible to even express, since Custodio isn't a BaulRole member (see BaulRole.cs).
    // UpdatePersonaRoleAsync_ShouldRejectChangingTheCustodioOwnRole below still covers the one
    // remaining case IsCustodioProtected guards against.

    [Fact]
    public async Task UpdatePersonaRoleAsync_ShouldRejectChangingTheCustodioOwnRole()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var custodioPersona = (await _fixture.Personas.GetPersonaByUserIdAsync(baulId, new UserId(CustodioId)))!;

        var manager = CreateManager(CustodioId);
        var result = await manager.UpdatePersonaRoleAsync(baulId, custodioPersona.Id, BaulRole.Colaborador);

        Assert.True(result.IsFailure);
        Assert.Equal("The custodio role cannot be changed", result.Error.Message);

        var persona = await _fixture.Personas.GetPersonaByIdAsync(custodioPersona.Id);
        Assert.Equal(BaulRole.Administrador, persona!.Role);
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
        var persisted = await _fixture.Personas.GetPersonaByIdAsync(personaId);
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
        var persisted = await _fixture.Personas.GetPersonaByIdAsync(personaId);
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
    public async Task UpdatePersonaBiografiaAsync_ShouldReject_WhenBiografiaIsNotEnabled()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela");

        var manager = CreateManager(CustodioId, biografiaEnabled: false);
        var result = await manager.UpdatePersonaBiografiaAsync(baulId, personaId, "Nació en Asturias en 1945.");

        Assert.True(result.IsFailure);
        Assert.Equal("Biografia is not enabled", result.Error.Message);
        var persisted = await _fixture.Personas.GetPersonaByIdAsync(personaId);
        Assert.Null(persisted!.Biografia);
    }

    [Fact]
    public async Task UpdatePersonaAvatarAsync_ShouldCreateLoosePhoto_TagPersona_AndStoreCrop()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var personaId = await _fixture.AddPendingPersonaAsync(baulId, "Abuela");

        var photoId = Guid.NewGuid();
        var manager = CreateManager(CustodioId, photoId);
        using var content = new MemoryStream([1, 2, 3]);
        var crop = new ImageCrop(0.25m, 0.75m, 1.8m);
        var result = await manager.UpdatePersonaAvatarAsync(
            baulId, personaId, content, crop, new ClientUploadId(Guid.NewGuid()));

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value.AvatarUrl);
        Assert.Equal(photoId.ToString(), result.Value.AvatarPhotoId);
        Assert.Equal(0.25m, result.Value.AvatarCropX);
        Assert.Equal(0.75m, result.Value.AvatarCropY);
        Assert.Equal(1.8m, result.Value.AvatarCropScale);

        var persona = await _fixture.Personas.GetPersonaByIdAsync(personaId);
        Assert.Equal(new PhotoId(photoId), persona!.AvatarPhotoId);

        var photo = await _fixture.Photos.GetByIdAsync(new PhotoId(photoId));
        Assert.NotNull(photo);
        Assert.Null(photo!.ChapterId);
        Assert.Equal(3, photo.SizeBytes);
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
            baulId, personaId, photoId, new ImageCrop(0.4m, 0.6m, 2m));

        Assert.True(result.IsSuccess);
        Assert.Equal(photoId.ToString(), result.Value.AvatarPhotoId);
        Assert.Contains(personaId, await _fixture.PhotoPersonaTags.GetPersonaIdsByPhotoIdAsync(photoId));

        var persona = await _fixture.Personas.GetPersonaByIdAsync(personaId);
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
            baulId, personaId, foreignPhotoId, new ImageCrop(0.5m, 0.5m, 1m));

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error.Message);

        var persona = await _fixture.Personas.GetPersonaByIdAsync(personaId);
        Assert.Null(persona!.AvatarPhotoId);
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

        var persona = await _fixture.Personas.GetPersonaByIdAsync(personaId);
        Assert.NotNull(persona);
        Assert.Null(persona.UserId);
        // RemovePersonaAsync ("Revocar acceso") clears the account link (and invite token) and
        // sets the persona's role to SinAcceso, so it ends up in exactly the state an admin
        // would get by picking "Sin acceso" directly — falls back to Pending, but needs a
        // different role picked before it can be invited again.
        Assert.Equal(BaulRole.SinAcceso, persona.Role);
        Assert.Equal(PersonaAccessStatus.Pending, persona.AccessStatus);
    }

    [Fact]
    public async Task RemovePersonaAsync_ShouldRejectCustodio()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var custodioPersona = (await _fixture.Personas.GetPersonaByUserIdAsync(baulId, new UserId(CustodioId)))!;

        var manager = CreateManager(CustodioId);
        var result = await manager.RemovePersonaAsync(baulId, custodioPersona.Id);

        Assert.True(result.IsFailure);
        Assert.Equal("The custodio cannot lose access", result.Error.Message);
    }

}
