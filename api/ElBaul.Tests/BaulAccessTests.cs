using ElBaul.Application.Bauls;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Personas;

using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using BaulAccess = ElBaul.Application.Bauls.BaulAccess;

using ElBaul.Domain;
namespace ElBaul.Tests;

// Focused coverage of the baúl-role authorization decision itself: the BaulAccess record's
// IsMember/IsAdmin/Role combinatorics, and BaulAccessService's resolve->authorize->log logic.
// No repository seeding beyond a one-method IBaulRepository stub — the manager test suites
// keep exactly one "denies access" scenario per capability group to prove wiring, and defer
// to this file for the role rule itself.
public class BaulAccessTests
{
    private const string OtherUserId = "user-2";

    private static readonly Baul TestBaul =
        new(new BaulId(Guid.NewGuid()), "Familia", null, new UserId("custodio-1"), 0, DateTime.UtcNow, DateTime.UtcNow);

    private static Persona MakePersona(BaulRole role, string? userId = OtherUserId, string? avatarKey = null) =>
        new(new PersonaId(Guid.NewGuid()), TestBaul.Id, userId is null ? null : new UserId(userId), "Nick", role, DateTime.UtcNow, AvatarPhotoKey: avatarKey);

    // --- BaulAccess record: pure combinatorics, no service involved ---

    [Theory]
    [InlineData(BaulRole.Colaborador, false, "colaborador")]
    [InlineData(BaulRole.Administrador, true, "administrador")]
    public void IsAdmin_ShouldFollowPersonaRole_ForNonCustodioMember(BaulRole role, bool expectedIsAdmin, string expectedRoleApiString)
    {
        var access = new BaulAccess(TestBaul, IsCustodio: false, MakePersona(role));

        Assert.True(access.IsMember);
        Assert.Equal(expectedIsAdmin, access.IsAdmin);
        Assert.Equal(expectedRoleApiString, access.RoleApiString);
    }

    [Theory]
    [InlineData(BaulRole.Colaborador)]
    [InlineData(BaulRole.Administrador)]
    public void IsCustodio_ShouldGrantMemberAndAdmin_RegardlessOfAnyPersonaRole(BaulRole personaRole)
    {
        // The custodio flag comes from Baul.CustodioId, independent of whatever Persona row
        // (if any) that same user happens to also have — it must always win. There's no
        // Custodio Persona.Role to also try here (see BaulRole.cs) — IsCustodio is the only
        // signal for custody.
        var access = new BaulAccess(TestBaul, IsCustodio: true, MakePersona(personaRole));

        Assert.True(access.IsMember);
        Assert.True(access.IsAdmin);
        Assert.Equal("administrador", access.RoleApiString);
    }

    [Fact]
    public void IsCustodio_ShouldGrantMemberAndAdmin_WithNoPersonaRowAtAll()
    {
        var access = new BaulAccess(TestBaul, IsCustodio: true, Persona: null);

        Assert.True(access.IsMember);
        Assert.True(access.IsAdmin);
        Assert.Equal("administrador", access.RoleApiString);
    }

    [Fact]
    public void NonMember_ShouldDenyMembershipAndAdmin_WhenNeitherCustodioNorPersona()
    {
        var access = new BaulAccess(TestBaul, IsCustodio: false, Persona: null);

        Assert.False(access.IsMember);
        Assert.False(access.IsAdmin);
    }

    [Fact]
    public void SinAccesoPersona_ShouldDenyMembershipAndAdmin()
    {
        var access = new BaulAccess(TestBaul, IsCustodio: false, MakePersona(BaulRole.SinAcceso));

        Assert.False(access.IsMember);
        Assert.False(access.IsAdmin);
        Assert.Equal("sin_acceso", access.RoleApiString);
    }

    // --- BaulAccessService.GetAsync: derives IsCustodio from Baul.CustodioId and attaches
    // whatever Persona row the repository returns for (baulId, userId) ---

    [Fact]
    public async Task GetAsync_ShouldSetIsCustodio_WhenUserIdMatchesBaulCustodioId()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetPersonaByUserIdAsync(TestBaul.Id, TestBaul.CustodioId).Returns((Persona?)null);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var access = await service.GetAsync(TestBaul, TestBaul.CustodioId);

        Assert.True(access.IsCustodio);
        Assert.True(access.IsMember);
    }

    [Fact]
    public async Task GetAsync_ShouldAttachPersona_WhenCustodioAlsoHasAPersonaRow()
    {
        // Custodians get a real Persona row too (created by BaulManager.CreateAsync) — GetAsync
        // must surface it rather than short-circuit to null once IsCustodio is already known.
        var repo = Substitute.For<IBaulRepository>();
        var custodioPersona = MakePersona(BaulRole.Administrador, TestBaul.CustodioId);
        repo.GetPersonaByUserIdAsync(TestBaul.Id, TestBaul.CustodioId).Returns(custodioPersona);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var access = await service.GetAsync(TestBaul, TestBaul.CustodioId);

        Assert.True(access.IsCustodio);
        Assert.Equal(custodioPersona, access.Persona);
    }

    [Fact]
    public async Task GetAsync_ShouldNotSetIsCustodio_ForAnyOtherUser()
    {
        var repo = Substitute.For<IBaulRepository>();
        var persona = MakePersona(BaulRole.Colaborador, OtherUserId);
        repo.GetPersonaByUserIdAsync(TestBaul.Id, new UserId(OtherUserId)).Returns(persona);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var access = await service.GetAsync(TestBaul, new UserId(OtherUserId));

        Assert.False(access.IsCustodio);
        Assert.Equal(persona, access.Persona);
        Assert.True(access.IsMember);
        Assert.False(access.IsAdmin);
    }

    // --- BaulAccessService.GetAccessibleAsync: the list-level visibility rule ---

    [Fact]
    public async Task GetAccessibleAsync_ShouldReturnEmpty_WhenUserHasNoBaules()
    {
        var userId = new UserId(OtherUserId);
        var repo = Substitute.For<IBaulRepository>();
        repo.GetOwnedByUserIdAsync(userId).Returns([]);
        repo.GetSharedByUserIdAsync(userId).Returns([]);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var accesses = await service.GetAccessibleAsync(userId);

        Assert.Empty(accesses);
    }

    [Fact]
    public async Task GetAccessibleAsync_ShouldReturnOwnedBaulesAsCustodioAdministrador()
    {
        var userId = TestBaul.CustodioId;
        var repo = Substitute.For<IBaulRepository>();
        repo.GetOwnedByUserIdAsync(userId).Returns([TestBaul]);
        repo.GetSharedByUserIdAsync(userId).Returns([]);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var access = Assert.Single(await service.GetAccessibleAsync(userId));

        Assert.Equal(TestBaul.Id, access.Baul.Id);
        Assert.True(access.IsCustodio);
        Assert.Equal("administrador", access.RoleApiString);
    }

    [Fact]
    public async Task GetAccessibleAsync_ShouldReturnSharedBaulesWithTheirRole()
    {
        var userId = new UserId(OtherUserId);
        var repo = Substitute.For<IBaulRepository>();
        repo.GetOwnedByUserIdAsync(userId).Returns([]);
        repo.GetSharedByUserIdAsync(userId).Returns(
            [new ElBaul.OutputPorts.Bauls.BaulAccess(TestBaul, BaulRole.Colaborador)]);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var access = Assert.Single(await service.GetAccessibleAsync(userId));

        Assert.Equal(TestBaul.Id, access.Baul.Id);
        Assert.False(access.IsCustodio);
        Assert.Equal("colaborador", access.RoleApiString);
    }

    [Fact]
    public async Task GetAccessibleAsync_ShouldDeduplicateOverlappingOwnedAndSharedBaules()
    {
        var userId = TestBaul.CustodioId;
        var repo = Substitute.For<IBaulRepository>();
        repo.GetOwnedByUserIdAsync(userId).Returns([TestBaul]);
        repo.GetSharedByUserIdAsync(userId).Returns(
            [new ElBaul.OutputPorts.Bauls.BaulAccess(TestBaul, BaulRole.Colaborador)]);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var access = Assert.Single(await service.GetAccessibleAsync(userId));

        Assert.Equal(TestBaul.Id, access.Baul.Id);
        Assert.True(access.IsCustodio);
        Assert.Equal("administrador", access.RoleApiString);
    }

    // --- BaulAccessService.AuthorizeAsync: the resolve -> authorize -> log sequence ---

    [Fact]
    public async Task AuthorizeAsync_ShouldFail_WhenBaulDoesNotExist()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetByIdAsync(TestBaul.Id).Returns((Baul?)null);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var result = await service.AuthorizeAsync(TestBaul.Id, new UserId(OtherUserId), AccessLevel.Member, "Test op");

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error.Message);
    }

    [Fact]
    public async Task AuthorizeAsync_ShouldFail_ForMemberLevel_WhenCallerHasNoRelationToBaul()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetByIdAsync(TestBaul.Id).Returns(TestBaul);
        repo.GetPersonaByUserIdAsync(TestBaul.Id, new UserId(OtherUserId)).Returns((Persona?)null);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var result = await service.AuthorizeAsync(TestBaul.Id, new UserId(OtherUserId), AccessLevel.Member, "Test op");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task AuthorizeAsync_ShouldFail_ForAdminLevel_WhenMemberIsOnlyColaborador()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetByIdAsync(TestBaul.Id).Returns(TestBaul);
        repo.GetPersonaByUserIdAsync(TestBaul.Id, new UserId(OtherUserId)).Returns(MakePersona(BaulRole.Colaborador));
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var result = await service.AuthorizeAsync(TestBaul.Id, new UserId(OtherUserId), AccessLevel.Admin, "Test op");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task AuthorizeAsync_ShouldSucceed_ForMemberLevel_WhenColaborador()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetByIdAsync(TestBaul.Id).Returns(TestBaul);
        var persona = MakePersona(BaulRole.Colaborador);
        repo.GetPersonaByUserIdAsync(TestBaul.Id, new UserId(OtherUserId)).Returns(persona);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var result = await service.AuthorizeAsync(TestBaul.Id, new UserId(OtherUserId), AccessLevel.Member, "Test op");

        Assert.True(result.IsSuccess);
        Assert.Equal(persona, result.Value.Persona);
    }

    [Fact]
    public async Task AuthorizeAsync_ShouldSucceed_ForAdminLevel_WhenAdministrador()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetByIdAsync(TestBaul.Id).Returns(TestBaul);
        repo.GetPersonaByUserIdAsync(TestBaul.Id, new UserId(OtherUserId)).Returns(MakePersona(BaulRole.Administrador));
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var result = await service.AuthorizeAsync(TestBaul.Id, new UserId(OtherUserId), AccessLevel.Admin, "Test op");

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task AuthorizeAsync_ShouldSucceed_ForAdminLevel_WhenCustodio()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetByIdAsync(TestBaul.Id).Returns(TestBaul);
        repo.GetPersonaByUserIdAsync(TestBaul.Id, TestBaul.CustodioId).Returns((Persona?)null);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var result = await service.AuthorizeAsync(TestBaul.Id, TestBaul.CustodioId, AccessLevel.Admin, "Test op");

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task AuthorizeAsync_WithPreloadedBaul_ShouldSkipTheRepositoryLookup()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetPersonaByUserIdAsync(TestBaul.Id, new UserId(OtherUserId)).Returns(MakePersona(BaulRole.Colaborador));
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var result = await service.AuthorizeAsync(TestBaul, new UserId(OtherUserId), AccessLevel.Member, "Test op");

        Assert.True(result.IsSuccess);
        await repo.DidNotReceive().GetByIdAsync(Arg.Any<BaulId>());
    }

    // BaulAccessService.GetAuthorInfoAsync moved out to AuthorInfoProjector — see
    // AuthorInfoProjectorTests for the persona-facing display identity coverage that used
    // to live here (default nickname, avatar-key resolution, persona-not-found fallback).
}
