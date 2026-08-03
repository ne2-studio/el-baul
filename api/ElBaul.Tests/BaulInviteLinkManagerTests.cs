using ElBaul.Application;
using ElBaul.Infra.Lite;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Tests;

public class BaulInviteLinkManagerTests
{
    private static readonly DateTime Now = new(2026, 7, 31, 12, 0, 0, DateTimeKind.Utc);
    private const string CustodioId = "custodio-1";
    private const string GuestId = "guest-1";

    private readonly InMemoryBaulInviteLinkRepository _links = new();
    private readonly InMemoryBaulRepository _baules = new();
    private readonly InMemoryPhotoRepository _photos = new();
    private readonly InMemoryUserRepository _users = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();
    private readonly StaticAppConfiguration _configuration = new(publicUrl: "https://app.el-baul.test");

    public BaulInviteLinkManagerTests()
    {
        _users.Seed(new User(CustodioId, "custodio@test.com", "Custodio", Now));
        _users.Seed(new User(GuestId, "guest@test.com", "Invitado", Now));
    }

    private async Task<BaulId> SeedBaulAsync()
    {
        var baulId = new BaulId(Guid.NewGuid());
        await _baules.CreateAsync(new Baul(baulId, "Familia Pérez", null, CustodioId, 0, Now, Now));
        await _baules.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, CustodioId, "Custodio", BaulRole.Custodio, Now));
        return baulId;
    }

    private BaulInviteLinkManager CreateManager(
        string currentUserId, UserInfo? userInfo = null, IProfilePictureFetcher? pictureFetcher = null, string? accessToken = "token-abc") =>
        new(
            NullLogger<BaulInviteLinkManager>.Instance, _links, _baules, _photos, _users, _photoStorage,
            new FakeUserInfoClient(userInfo), pictureFetcher ?? new FakeProfilePictureFetcher(),
            new StaticIdGenerator(Guid.NewGuid()), _clock, new StaticCurrentUserProvider(currentUserId, accessToken),
            _configuration, new BaulAccessService(_baules, NullLogger<BaulAccessService>.Instance, _photos),
            new PersonaDtoProjector(_photos, _photoStorage));

    [Fact]
    public async Task GetOrCreateAsync_ShouldDenyAccess_WhenCallerIsNotAdmin()
    {
        var baulId = await SeedBaulAsync();
        await _baules.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, GuestId, "Invitado", BaulRole.Colaborador, Now));

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
        Assert.Equal($"https://app.el-baul.test/invitacion/baul/{result.Value.Token}", result.Value.Url);
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

        var persona = await _baules.GetPersonaByUserIdAsync(baulId, GuestId);
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
        var personas = await _baules.GetPersonasAsync(baulId);
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
        Assert.Equal("custodio", result.Value.Role);
        var personas = await _baules.GetPersonasAsync(baulId);
        Assert.Single(personas);
    }

    [Fact]
    public async Task AcceptAsync_ShouldReject_WhenCallerAccessWasRevoked()
    {
        var baulId = await SeedBaulAsync();
        await _baules.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, GuestId, "Invitado", BaulRole.SinAcceso, Now));
        var link = await CreateManager(CustodioId).GetOrCreateAsync(baulId);

        var result = await CreateManager(GuestId).AcceptAsync(link.Value.Token);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.Validation, result.Error.Code);
        var personas = await _baules.GetPersonasAsync(baulId);
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
    public async Task AcceptAsync_ShouldImportAvatar_WhenPictureClaimPresent()
    {
        var baulId = await SeedBaulAsync();
        var link = await CreateManager(CustodioId).GetOrCreateAsync(baulId);
        var userInfo = new UserInfo("guest@test.com", "Invitado", "https://provider.test/avatar.jpg");
        var fetcher = new FakeProfilePictureFetcher([1, 2, 3]);

        var result = await CreateManager(GuestId, userInfo, fetcher).AcceptAsync(link.Value.Token);

        Assert.True(result.IsSuccess);
        Assert.NotEmpty(_photoStorage.SavedKeys);
        var persona = await _baules.GetPersonaByUserIdAsync(baulId, GuestId);
        Assert.NotNull(persona!.AvatarPhotoKey);
    }

    [Fact]
    public async Task AcceptAsync_ShouldSucceed_WhenAvatarFetchThrows()
    {
        var baulId = await SeedBaulAsync();
        var link = await CreateManager(CustodioId).GetOrCreateAsync(baulId);
        var userInfo = new UserInfo("guest@test.com", "Invitado", "https://provider.test/avatar.jpg");
        var throwingFetcher = new FakeProfilePictureFetcher(throwOnFetch: true);

        var result = await CreateManager(GuestId, userInfo, throwingFetcher).AcceptAsync(link.Value.Token);

        Assert.True(result.IsSuccess);
        Assert.Empty(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task AcceptAsync_ShouldSucceed_WhenNoPictureClaim()
    {
        var baulId = await SeedBaulAsync();
        var link = await CreateManager(CustodioId).GetOrCreateAsync(baulId);
        var userInfo = new UserInfo("guest@test.com", "Invitado");

        var result = await CreateManager(GuestId, userInfo).AcceptAsync(link.Value.Token);

        Assert.True(result.IsSuccess);
        Assert.Empty(_photoStorage.SavedKeys);
    }

    [Fact]
    public async Task GetClaimablePersonasAsync_ShouldReturnOnlyPendingPersonas()
    {
        const string OutsiderId = "outsider-1";
        var baulId = await SeedBaulAsync();
        var pendingId = new PersonaId(Guid.NewGuid());
        await _baules.AddPersonaAsync(new Persona(pendingId, baulId, null, "Abuela", BaulRole.Colaborador, Now, Name: "María"));
        await _baules.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, GuestId, "Ya unido", BaulRole.Colaborador, Now));
        await _baules.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, null, "Sin acceso", BaulRole.SinAcceso, Now));
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
        await _baules.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, null, "Abuela", BaulRole.Colaborador, Now, Name: "María"));
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
        await _baules.AddPersonaAsync(new Persona(pendingId, baulId, null, "Abuela", BaulRole.Colaborador, Now));
        var link = await CreateManager(CustodioId).GetOrCreateAsync(baulId);

        var result = await CreateManager(GuestId).AcceptAsync(link.Value.Token, pendingId);

        Assert.True(result.IsSuccess);
        Assert.Equal(pendingId.ToString(), result.Value.Id);
        Assert.Equal("Abuela", result.Value.Nickname);
        Assert.Equal(GuestId, result.Value.UserId);
        Assert.Equal("active", result.Value.Status);

        var personas = await _baules.GetPersonasAsync(baulId);
        Assert.Equal(2, personas.Count()); // custodio + claimed Abuela — no extra persona created
    }

    [Fact]
    public async Task AcceptAsync_ShouldReject_WhenChosenPersonaIsNotClaimable()
    {
        var baulId = await SeedBaulAsync();
        var alreadyClaimedId = new PersonaId(Guid.NewGuid());
        await _baules.AddPersonaAsync(new Persona(alreadyClaimedId, baulId, "someone-else", "Ya unido", BaulRole.Colaborador, Now));
        var link = await CreateManager(CustodioId).GetOrCreateAsync(baulId);

        var result = await CreateManager(GuestId).AcceptAsync(link.Value.Token, alreadyClaimedId);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.Validation, result.Error.Code);
        var persona = await _baules.GetPersonaByIdAsync(alreadyClaimedId);
        Assert.Equal("someone-else", persona!.UserId);
    }

    [Fact]
    public async Task AcceptAsync_ShouldReject_WhenChosenPersonaBelongsToAnotherBaul()
    {
        var baulId = await SeedBaulAsync();
        var otherBaulId = await SeedBaulAsync();
        var otherBaulPendingId = new PersonaId(Guid.NewGuid());
        await _baules.AddPersonaAsync(new Persona(otherBaulPendingId, otherBaulId, null, "Abuela", BaulRole.Colaborador, Now));
        var link = await CreateManager(CustodioId).GetOrCreateAsync(baulId);

        var result = await CreateManager(GuestId).AcceptAsync(link.Value.Token, otherBaulPendingId);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.Validation, result.Error.Code);
    }
}
