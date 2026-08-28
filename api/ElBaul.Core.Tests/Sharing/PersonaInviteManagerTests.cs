using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Personas.Application;
using ElBaul.Core.Sharing.Application;
using ElBaul.Infra.Lite;
using ElBaul.Core.Photos.Application;
using Ne2Studio.Common;

using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class PersonaInviteManagerTests
{
    private static readonly DateTime Now = new(2026, 7, 31, 12, 0, 0, DateTimeKind.Utc);
    private const string CustodioId = "custodio-1";
    private const string GuestId = "guest-1";
    private const string OtherGuestId = "guest-2";

    private readonly InMemoryPersonaRepository _personas = new();
    private readonly InMemoryBaulRepository _baules;
    private readonly InMemoryPhotoRepository _photos = new();
    private readonly InMemoryUserRepository _users = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticAppConfiguration _configuration = new(
        publicUrl: "https://app.el-baul.test",
        apiPublicUrl: "https://api.el-baul.test");

    public PersonaInviteManagerTests()
    {
        _baules = new InMemoryBaulRepository(_personas);
        _users.Seed(new User(new UserId(CustodioId), "custodio@test.com", "Custodio", null, Now));
        _users.Seed(new User(new UserId(GuestId), "guest@test.com", "Invitado", null, Now));
        _users.Seed(new User(new UserId(OtherGuestId), "guest2@test.com", "Otro invitado", null, Now));
    }

    private async Task<BaulId> SeedBaulAsync()
    {
        var baulId = new BaulId(Guid.NewGuid());
        await _baules.CreateAsync(new Baul(baulId, "Familia Pérez", null, new UserId(CustodioId), 0, Now, Now));
        await _personas.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId(CustodioId), "Custodio", BaulRole.Administrador, Now));
        return baulId;
    }

    private async Task<PersonaId> SeedPendingPersonaAsync(BaulId baulId, string nickname = "Tía Loli")
    {
        var persona = new Persona(new PersonaId(Guid.NewGuid()), baulId, null, nickname, BaulRole.Colaborador, Now);
        await _personas.AddPersonaAsync(persona);
        return persona.Id;
    }

    private PersonaInviteManager CreateManager(string currentUserId) =>
        new(
            NullLogger<PersonaInviteManager>.Instance, _personas, _baules, _photos, _users, _photoStorage,
            new CoverUrlResolver(_photoStorage),
            new StaticIdGenerator(Guid.NewGuid()), new StaticCurrentUserProvider(currentUserId),
            _configuration, new BaulAccessService(_baules, _personas, NullLogger<BaulAccessService>.Instance),
            new PersonaDtoProjector(_photos, _photoStorage, _users));

    // --- InviteAsync ---

    [Fact]
    public async Task InviteAsync_ShouldDenyAccess_WhenCallerIsNotAdmin()
    {
        var baulId = await SeedBaulAsync();
        await _personas.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId(GuestId), "Invitado", BaulRole.Colaborador, Now));
        var personaId = await SeedPendingPersonaAsync(baulId);

        var result = await CreateManager(GuestId).InviteAsync(baulId, personaId);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.Forbidden, result.Error.Code);
    }

    [Fact]
    public async Task InviteAsync_ShouldIssueAToken_WithAnAppUrl()
    {
        var baulId = await SeedBaulAsync();
        var personaId = await SeedPendingPersonaAsync(baulId);

        var result = await CreateManager(CustodioId).InviteAsync(baulId, personaId);

        Assert.True(result.IsSuccess);
        Assert.Equal($"https://api.el-baul.test/invitacion/baul/{result.Value.Token}", result.Value.Url);
        Assert.Equal(result.Value.Token, (await _personas.GetPersonaByIdAsync(personaId))!.InviteToken);
    }

    [Fact]
    public async Task InviteAsync_ShouldReshareTheSameToken_OnASecondCall()
    {
        var baulId = await SeedBaulAsync();
        var personaId = await SeedPendingPersonaAsync(baulId);
        var manager = CreateManager(CustodioId);

        var first = await manager.InviteAsync(baulId, personaId);
        var second = await manager.InviteAsync(baulId, personaId);

        Assert.Equal(first.Value.Token, second.Value.Token);
    }

    [Fact]
    public async Task InviteAsync_ShouldFail_WhenPersonaAlreadyClaimed()
    {
        var baulId = await SeedBaulAsync();
        var persona = new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId(GuestId), "Ya dentro", BaulRole.Colaborador, Now);
        await _personas.AddPersonaAsync(persona);

        var result = await CreateManager(CustodioId).InviteAsync(baulId, persona.Id);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.Validation, result.Error.Code);
    }

    [Fact]
    public async Task InviteAsync_ShouldFail_WhenPersonaHasNoAccess()
    {
        var baulId = await SeedBaulAsync();
        var persona = new Persona(new PersonaId(Guid.NewGuid()), baulId, null, "Sin acceso", BaulRole.SinAcceso, Now);
        await _personas.AddPersonaAsync(persona);

        var result = await CreateManager(CustodioId).InviteAsync(baulId, persona.Id);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.Validation, result.Error.Code);
    }

    [Fact]
    public async Task InviteAsync_ShouldFail_WhenPersonaNotFound()
    {
        var baulId = await SeedBaulAsync();

        var result = await CreateManager(CustodioId).InviteAsync(baulId, new PersonaId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, result.Error.Code);
    }

    // --- GetPreviewAsync / GetLandingAsync ---

    [Fact]
    public async Task GetPreviewAsync_ShouldReturnBaulInfo_ForAValidToken()
    {
        var baulId = await SeedBaulAsync();
        var personaId = await SeedPendingPersonaAsync(baulId);
        var manager = CreateManager(CustodioId);
        var invite = await manager.InviteAsync(baulId, personaId);

        var preview = await manager.GetPreviewAsync(invite.Value.Token);

        Assert.True(preview.IsSuccess);
        Assert.Equal("Familia Pérez", preview.Value.Name);
    }

    [Fact]
    public async Task GetPreviewAsync_ShouldFail_ForAnUnknownToken()
    {
        var manager = CreateManager(CustodioId);

        var preview = await manager.GetPreviewAsync("unknown-token");

        Assert.True(preview.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, preview.Error.Code);
    }

    [Fact]
    public async Task GetLandingAsync_ShouldBuildTheAppUrl_FromTheToken()
    {
        var baulId = await SeedBaulAsync();
        var personaId = await SeedPendingPersonaAsync(baulId);
        var manager = CreateManager(CustodioId);
        var invite = await manager.InviteAsync(baulId, personaId);

        var landing = await manager.GetLandingAsync(invite.Value.Token);

        Assert.True(landing.IsSuccess);
        Assert.Equal($"https://app.el-baul.test/invitacion/baul/{invite.Value.Token}?entry=link", landing.Value.AppUrl);
    }

    // --- AcceptAsync ---

    [Fact]
    public async Task AcceptAsync_ShouldClaimTheTargetPersona()
    {
        var baulId = await SeedBaulAsync();
        var personaId = await SeedPendingPersonaAsync(baulId, "Tía Loli");
        var manager = CreateManager(CustodioId);
        var invite = await manager.InviteAsync(baulId, personaId);

        var result = await CreateManager(GuestId).AcceptAsync(invite.Value.Token);

        Assert.True(result.IsSuccess);
        Assert.Equal(personaId.ToString(), result.Value.Id);
        Assert.Equal("active", result.Value.Status);
        var persona = await _personas.GetPersonaByIdAsync(personaId);
        Assert.Equal(new UserId(GuestId), persona!.UserId);
    }

    [Fact]
    public async Task AcceptAsync_ShouldFail_ForAnUnknownToken()
    {
        var result = await CreateManager(GuestId).AcceptAsync("unknown-token");

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, result.Error.Code);
    }

    [Fact]
    public async Task AcceptAsync_ShouldBeIdempotent_WhenTheSameCallerAcceptsTwice()
    {
        var baulId = await SeedBaulAsync();
        var personaId = await SeedPendingPersonaAsync(baulId);
        var inviteManager = CreateManager(CustodioId);
        var invite = await inviteManager.InviteAsync(baulId, personaId);
        var guestManager = CreateManager(GuestId);
        await guestManager.AcceptAsync(invite.Value.Token);

        var second = await guestManager.AcceptAsync(invite.Value.Token);

        Assert.True(second.IsSuccess);
        Assert.Equal(personaId.ToString(), second.Value.Id);
    }

    [Fact]
    public async Task AcceptAsync_ShouldReject_WhenPersonaAlreadyClaimedByAnotherAccount()
    {
        var baulId = await SeedBaulAsync();
        var personaId = await SeedPendingPersonaAsync(baulId);
        var inviteManager = CreateManager(CustodioId);
        var invite = await inviteManager.InviteAsync(baulId, personaId);
        await CreateManager(GuestId).AcceptAsync(invite.Value.Token);

        // Same token, different (not-yet-a-member) caller — the persona it points to was
        // already claimed by someone else in the meantime.
        var result = await CreateManager(OtherGuestId).AcceptAsync(invite.Value.Token);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, result.Error.Code);
    }

    [Fact]
    public async Task AcceptAsync_ShouldNoOp_WhenCallerAlreadyHasADifferentPersonaInTheBaul()
    {
        var baulId = await SeedBaulAsync();
        var personaId = await SeedPendingPersonaAsync(baulId, "Tía Loli");
        await _personas.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId(GuestId), "Ya soy miembro", BaulRole.Colaborador, Now));
        var invite = await CreateManager(CustodioId).InviteAsync(baulId, personaId);

        var result = await CreateManager(GuestId).AcceptAsync(invite.Value.Token);

        Assert.True(result.IsSuccess);
        Assert.NotEqual(personaId.ToString(), result.Value.Id);
        Assert.Equal(PersonaAccessStatus.Pending, (await _personas.GetPersonaByIdAsync(personaId))!.AccessStatus);
    }
}
