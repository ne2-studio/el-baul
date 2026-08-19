using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Personas.Application;
using ElBaul.Core.Sharing.Application;
using ElBaul.Infra.Lite;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.Application;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using Ne2Studio.Common;

using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class BaulInviteLinkManagerTests
{
    private static readonly DateTime Now = new(2026, 7, 31, 12, 0, 0, DateTimeKind.Utc);
    private const string CustodioId = "custodio-1";
    private const string GuestId = "guest-1";

    private readonly InMemoryBaulInviteLinkRepository _links = new();
    private readonly InMemoryPersonaRepository _personas = new();
    private readonly InMemoryBaulRepository _baules;
    private readonly InMemoryPhotoRepository _photos = new();
    private readonly InMemoryUserRepository _users = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();
    private readonly StaticAppConfiguration _configuration = new(
        publicUrl: "https://app.el-baul.test",
        apiPublicUrl: "https://api.el-baul.test");

    public BaulInviteLinkManagerTests()
    {
        _baules = new InMemoryBaulRepository(_personas);
        _users.Seed(new User(new UserId(CustodioId), "custodio@test.com", "Custodio", Now));
        _users.Seed(new User(new UserId(GuestId), "guest@test.com", "Invitado", Now));
    }

    private async Task<BaulId> SeedBaulAsync()
    {
        var baulId = new BaulId(Guid.NewGuid());
        await _baules.CreateAsync(new Baul(baulId, "Familia Pérez", null, new UserId(CustodioId), 0, Now, Now));
        await _personas.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId(CustodioId), "Custodio", BaulRole.Administrador, Now));
        return baulId;
    }

    private BaulInviteLinkManager CreateManager(string currentUserId) =>
        new(
            NullLogger<BaulInviteLinkManager>.Instance, _links, _baules, _personas, _photos, _users, _photoStorage,
            new CoverUrlResolver(_photoStorage),
            new StaticIdGenerator(Guid.NewGuid()), _clock, new StaticCurrentUserProvider(currentUserId),
            _configuration, new BaulAccessService(_baules, _personas, NullLogger<BaulAccessService>.Instance),
            new PersonaDtoProjector(_photos, _photoStorage, _users));

    [Fact]
    public async Task GetOrCreateAsync_ShouldDenyAccess_WhenCallerIsNotAdmin()
    {
        var baulId = await SeedBaulAsync();
        await _personas.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId(GuestId), "Invitado", BaulRole.Colaborador, Now));

        var result = await CreateManager(GuestId).GetOrCreateAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.Forbidden, result.Error.Code);
    }

    [Fact]
    public async Task GetOrCreateAsync_ShouldCreateLink_WithAppUrl()
    {
        var baulId = await SeedBaulAsync();

        var result = await CreateManager(CustodioId).GetOrCreateAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Equal($"https://api.el-baul.test/invitacion/baul/{result.Value.Token}", result.Value.Url);
        Assert.NotNull(await _links.GetActiveByBaulIdAsync(baulId));
    }

    [Fact]
    public async Task GetOrCreateAsync_ShouldBeIdempotent()
    {
        var baulId = await SeedBaulAsync();
        var manager = CreateManager(CustodioId);

        var first = await manager.GetOrCreateAsync(baulId);
        var second = await manager.GetOrCreateAsync(baulId);

        Assert.Equal(first.Value.Token, second.Value.Token);
    }

    [Fact]
    public async Task RegenerateAsync_ShouldRevokeOldToken_AndIssueNew()
    {
        var baulId = await SeedBaulAsync();
        var manager = CreateManager(CustodioId);
        var original = await manager.GetOrCreateAsync(baulId);

        var regenerated = await manager.RegenerateAsync(baulId);

        Assert.True(regenerated.IsSuccess);
        Assert.NotEqual(original.Value.Token, regenerated.Value.Token);

        var oldPreview = await manager.GetPreviewAsync(original.Value.Token);
        Assert.True(oldPreview.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, oldPreview.Error.Code);

        var newPreview = await manager.GetPreviewAsync(regenerated.Value.Token);
        Assert.True(newPreview.IsSuccess);
    }

    [Fact]
    public async Task RegenerateAsync_ShouldCreateLink_WhenNoneExistedYet()
    {
        var baulId = await SeedBaulAsync();

        var result = await CreateManager(CustodioId).RegenerateAsync(baulId);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task GetPreviewAsync_ShouldReturnNotFound_WhenTokenUnknown()
    {
        var result = await CreateManager(CustodioId).GetPreviewAsync("unknown-token");

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, result.Error.Code);
    }

    [Fact]
    public async Task GetPreviewAsync_ShouldReturnBaulDetails()
    {
        var baulId = await SeedBaulAsync();
        var manager = CreateManager(CustodioId);
        var link = await manager.GetOrCreateAsync(baulId);

        var preview = await manager.GetPreviewAsync(link.Value.Token);

        Assert.True(preview.IsSuccess);
        Assert.Equal("Familia Pérez", preview.Value.Name);
        Assert.Equal(baulId.ToString(), preview.Value.BaulId);
    }

    [Fact]
    public async Task GetPreviewAsync_ShouldIncludeCoverPhotoAndPersonaAvatars()
    {
        var baulId = await SeedBaulAsync();
        var baul = await _baules.GetByIdAsync(baulId);
        var coverPhoto = new Photo(new PhotoId(Guid.NewGuid()), null, baulId, "cover-key", null, null, null, new UserId(CustodioId), Now);
        await _photos.CreateAsync(coverPhoto);
        await _baules.UpdateAsync(baul!.WithCover(coverPhoto, new ImageCrop(0.5m, 0.5m, 1m), Now));

        // Custodio persona (seeded by SeedBaulAsync) has no avatar and should be skipped.
        var avatarPhoto = new Photo(new PhotoId(Guid.NewGuid()), null, baulId, "avatar-key", null, null, null, new UserId(CustodioId), Now);
        await _photos.CreateAsync(avatarPhoto);
        await _personas.AddPersonaAsync(new Persona(
            new PersonaId(Guid.NewGuid()), baulId, new UserId(GuestId), "Invitado", BaulRole.Colaborador, Now,
            AvatarPhotoId: avatarPhoto.Id));

        var manager = CreateManager(CustodioId);
        var link = await manager.GetOrCreateAsync(baulId);

        var preview = await manager.GetPreviewAsync(link.Value.Token);

        Assert.True(preview.IsSuccess);
        Assert.Equal("https://imgproxy.test/BaulCover/cover-key", preview.Value.CoverPhotoUrl);
        Assert.Equal(["https://imgproxy.test/PersonaAvatar/avatar-key"], preview.Value.PersonaAvatarUrls);
    }

    [Fact]
    public async Task GetLandingAsync_ShouldUseBaulCoverAsOpenGraphImage()
    {
        var baulId = await SeedBaulAsync();
        var baul = await _baules.GetByIdAsync(baulId);
        var coverPhoto = new Photo(new PhotoId(Guid.NewGuid()), null, baulId, "cover-key", null, null, null, new UserId(CustodioId), Now);
        await _photos.CreateAsync(coverPhoto);
        await _baules.UpdateAsync(baul!.WithCover(coverPhoto, new ImageCrop(0.5m, 0.5m, 1m), Now));

        var manager = CreateManager(CustodioId);
        var link = await manager.GetOrCreateAsync(baulId);

        var landing = await manager.GetLandingAsync(link.Value.Token);

        Assert.True(landing.IsSuccess);
        Assert.Equal("Invitación a Familia Pérez", landing.Value.Title);
        Assert.Equal("https://imgproxy.test/BaulCover/cover-key", landing.Value.ImageUrl);
        Assert.Equal($"https://app.el-baul.test/invitacion/baul/{link.Value.Token}", landing.Value.AppUrl);
    }

    [Fact]
    public async Task GetPreviewAsync_ShouldResolveEachPersonasAvatar_Independently()
    {
        // Targets GetPreviewAsync's batched ProjectManyAsync avatar resolution specifically:
        // two members with different avatar photos must each surface their own avatar, not one
        // leaking onto the other — the exact mistake a broken dictionary lookup would produce.
        var baulId = await SeedBaulAsync();
        var firstAvatarPhoto = new Photo(new PhotoId(Guid.NewGuid()), null, baulId, "first-avatar-key", null, null, null, new UserId(CustodioId), Now);
        await _photos.CreateAsync(firstAvatarPhoto);
        await _personas.AddPersonaAsync(new Persona(
            new PersonaId(Guid.NewGuid()), baulId, new UserId(GuestId), "Invitado", BaulRole.Colaborador, Now,
            AvatarPhotoId: firstAvatarPhoto.Id));
        const string secondGuestId = "guest-2";
        _users.Seed(new User(new UserId(secondGuestId), "guest2@test.com", "Segundo invitado", Now));
        var secondAvatarPhoto = new Photo(new PhotoId(Guid.NewGuid()), null, baulId, "second-avatar-key", null, null, null, new UserId(CustodioId), Now);
        await _photos.CreateAsync(secondAvatarPhoto);
        await _personas.AddPersonaAsync(new Persona(
            new PersonaId(Guid.NewGuid()), baulId, new UserId(secondGuestId), "Segundo invitado", BaulRole.Colaborador, Now,
            AvatarPhotoId: secondAvatarPhoto.Id));

        var manager = CreateManager(CustodioId);
        var link = await manager.GetOrCreateAsync(baulId);

        var preview = await manager.GetPreviewAsync(link.Value.Token);

        Assert.True(preview.IsSuccess);
        Assert.Equal(2, preview.Value.PersonaAvatarUrls.Count);
        Assert.Contains("https://imgproxy.test/PersonaAvatar/first-avatar-key", preview.Value.PersonaAvatarUrls);
        Assert.Contains("https://imgproxy.test/PersonaAvatar/second-avatar-key", preview.Value.PersonaAvatarUrls);
    }

    [Fact]
    public async Task AcceptAsync_ShouldAutoCreatePersona_ForNewJoiner()
    {
        var baulId = await SeedBaulAsync();
        var custodioManager = CreateManager(CustodioId);
        var link = await custodioManager.GetOrCreateAsync(baulId);

        var result = await CreateManager(GuestId).AcceptAsync(link.Value.Token);

        Assert.True(result.IsSuccess);
        Assert.Equal("Invitado", result.Value.Nickname);
        Assert.Equal(GuestId, result.Value.UserId);
        Assert.Equal("colaborador", result.Value.Role);
        Assert.Equal("active", result.Value.Status);

        var persona = await _personas.GetPersonaByUserIdAsync(baulId, new UserId(GuestId));
        Assert.NotNull(persona);
    }

    [Fact]
    public async Task AcceptAsync_ShouldBeNoOp_ForExistingActiveMember()
    {
        var baulId = await SeedBaulAsync();
        var custodioManager = CreateManager(CustodioId);
        var link = await custodioManager.GetOrCreateAsync(baulId);
        await CreateManager(GuestId).AcceptAsync(link.Value.Token);

        var secondAccept = await CreateManager(GuestId).AcceptAsync(link.Value.Token);

        Assert.True(secondAccept.IsSuccess);
        var personas = await _personas.GetPersonasAsync(baulId);
        Assert.Single(personas, p => p.UserId == GuestId);
    }

    [Fact]
    public async Task AcceptAsync_ShouldBeNoOp_ForCustodioOpeningOwnLink()
    {
        var baulId = await SeedBaulAsync();
        var manager = CreateManager(CustodioId);
        var link = await manager.GetOrCreateAsync(baulId);

        var result = await manager.AcceptAsync(link.Value.Token);

        Assert.True(result.IsSuccess);
        Assert.Equal("administrador", result.Value.Role);
        Assert.True(result.Value.IsCustodio);
        var personas = await _personas.GetPersonasAsync(baulId);
        Assert.Single(personas);
    }

    [Fact]
    public async Task AcceptAsync_ShouldReject_WhenCallerAccessWasRevoked()
    {
        var baulId = await SeedBaulAsync();
        await _personas.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId(GuestId), "Invitado", BaulRole.SinAcceso, Now));
        var link = await CreateManager(CustodioId).GetOrCreateAsync(baulId);

        var result = await CreateManager(GuestId).AcceptAsync(link.Value.Token);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.Validation, result.Error.Code);
        var personas = await _personas.GetPersonasAsync(baulId);
        Assert.Single(personas, p => p.Role == BaulRole.SinAcceso);
    }

    [Fact]
    public async Task AcceptAsync_ShouldReturnNotFound_WhenTokenRevoked()
    {
        var baulId = await SeedBaulAsync();
        var manager = CreateManager(CustodioId);
        var link = await manager.GetOrCreateAsync(baulId);
        await manager.RegenerateAsync(baulId);

        var result = await CreateManager(GuestId).AcceptAsync(link.Value.Token);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, result.Error.Code);
    }

    [Fact]
    public async Task GetClaimablePersonasAsync_ShouldResolveEachPersonasAvatar_Independently()
    {
        // Same batching-isolation concern as GetPreviewAsync above, for the claimable-personas
        // list: two pending personas with different avatar photos must each keep their own.
        const string OutsiderId = "outsider-1";
        var baulId = await SeedBaulAsync();
        var firstPendingPhoto = new Photo(new PhotoId(Guid.NewGuid()), null, baulId, "first-pending-key", null, null, null, new UserId(CustodioId), Now);
        await _photos.CreateAsync(firstPendingPhoto);
        await _personas.AddPersonaAsync(new Persona(
            new PersonaId(Guid.NewGuid()), baulId, null, "Primera pendiente", BaulRole.Colaborador, Now,
            AvatarPhotoId: firstPendingPhoto.Id));
        var secondPendingPhoto = new Photo(new PhotoId(Guid.NewGuid()), null, baulId, "second-pending-key", null, null, null, new UserId(CustodioId), Now);
        await _photos.CreateAsync(secondPendingPhoto);
        await _personas.AddPersonaAsync(new Persona(
            new PersonaId(Guid.NewGuid()), baulId, null, "Segunda pendiente", BaulRole.Colaborador, Now,
            AvatarPhotoId: secondPendingPhoto.Id));
        var link = await CreateManager(CustodioId).GetOrCreateAsync(baulId);

        var result = await CreateManager(OutsiderId).GetClaimablePersonasAsync(link.Value.Token);

        Assert.True(result.IsSuccess);
        var claimable = result.Value.ToList();
        var first = claimable.Single(p => p.Nickname == "Primera pendiente");
        Assert.Equal("https://imgproxy.test/PersonaAvatar/first-pending-key", first.AvatarUrl);
        var second = claimable.Single(p => p.Nickname == "Segunda pendiente");
        Assert.Equal("https://imgproxy.test/PersonaAvatar/second-pending-key", second.AvatarUrl);
    }

    [Fact]
    public async Task GetClaimablePersonasAsync_ShouldReturnOnlyPendingPersonas()
    {
        const string OutsiderId = "outsider-1";
        var baulId = await SeedBaulAsync();
        var pendingId = new PersonaId(Guid.NewGuid());
        await _personas.AddPersonaAsync(new Persona(pendingId, baulId, null, "Abuela", BaulRole.Colaborador, Now, Name: "María"));
        await _personas.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId(GuestId), "Ya unido", BaulRole.Colaborador, Now));
        await _personas.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, null, "Sin acceso", BaulRole.SinAcceso, Now));
        var link = await CreateManager(CustodioId).GetOrCreateAsync(baulId);

        var result = await CreateManager(OutsiderId).GetClaimablePersonasAsync(link.Value.Token);

        Assert.True(result.IsSuccess);
        var claimable = Assert.Single(result.Value);
        Assert.Equal(pendingId.ToString(), claimable.Id);
        Assert.Equal("Abuela", claimable.Nickname);
        Assert.Equal("María", claimable.Name);
    }

    [Fact]
    public async Task GetClaimablePersonasAsync_ShouldReturnEmpty_WhenCallerAlreadyHasAPersonaInTheBaul()
    {
        var baulId = await SeedBaulAsync();
        await _personas.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, null, "Abuela", BaulRole.Colaborador, Now, Name: "María"));
        var link = await CreateManager(CustodioId).GetOrCreateAsync(baulId);

        var result = await CreateManager(CustodioId).GetClaimablePersonasAsync(link.Value.Token);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value);
    }

    [Fact]
    public async Task GetClaimablePersonasAsync_ShouldReturnNotFound_WhenTokenUnknown()
    {
        var result = await CreateManager(GuestId).GetClaimablePersonasAsync("unknown-token");

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, result.Error.Code);
    }

    [Fact]
    public async Task AcceptAsync_ShouldClaimTheChosenPendingPersona_InsteadOfCreatingANewOne()
    {
        var baulId = await SeedBaulAsync();
        var pendingId = new PersonaId(Guid.NewGuid());
        await _personas.AddPersonaAsync(new Persona(pendingId, baulId, null, "Abuela", BaulRole.Colaborador, Now));
        var link = await CreateManager(CustodioId).GetOrCreateAsync(baulId);

        var result = await CreateManager(GuestId).AcceptAsync(link.Value.Token, pendingId);

        Assert.True(result.IsSuccess);
        Assert.Equal(pendingId.ToString(), result.Value.Id);
        Assert.Equal("Abuela", result.Value.Nickname);
        Assert.Equal(GuestId, result.Value.UserId);
        Assert.Equal("active", result.Value.Status);

        var personas = await _personas.GetPersonasAsync(baulId);
        Assert.Equal(2, personas.Count()); // custodio + claimed Abuela — no extra persona created
    }

    [Fact]
    public async Task AcceptAsync_ShouldReject_WhenChosenPersonaIsNotClaimable()
    {
        var baulId = await SeedBaulAsync();
        var alreadyClaimedId = new PersonaId(Guid.NewGuid());
        await _personas.AddPersonaAsync(new Persona(alreadyClaimedId, baulId, new UserId("someone-else"), "Ya unido", BaulRole.Colaborador, Now));
        var link = await CreateManager(CustodioId).GetOrCreateAsync(baulId);

        var result = await CreateManager(GuestId).AcceptAsync(link.Value.Token, alreadyClaimedId);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.Validation, result.Error.Code);
        var persona = await _personas.GetPersonaByIdAsync(alreadyClaimedId);
        Assert.Equal("someone-else", persona!.UserId);
    }

    [Fact]
    public async Task AcceptAsync_ShouldReject_WhenChosenPersonaBelongsToAnotherBaul()
    {
        var baulId = await SeedBaulAsync();
        var otherBaulId = await SeedBaulAsync();
        var otherBaulPendingId = new PersonaId(Guid.NewGuid());
        await _personas.AddPersonaAsync(new Persona(otherBaulPendingId, otherBaulId, null, "Abuela", BaulRole.Colaborador, Now));
        var link = await CreateManager(CustodioId).GetOrCreateAsync(baulId);

        var result = await CreateManager(GuestId).AcceptAsync(link.Value.Token, otherBaulPendingId);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.Validation, result.Error.Code);
    }
}
