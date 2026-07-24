using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using BaulAccess = ElBaul.Application.BaulAccess;

namespace ElBaul.Tests;

// Focused coverage of the baúl-role authorization decision itself: the BaulAccess record's
// IsMember/IsAdmin/Role combinatorics, and BaulAccessService's resolve->authorize->log and
// author-identity logic. No repository seeding beyond a one-method IBaulRepository stub —
// the manager test suites keep exactly one "denies access" scenario per capability group to
// prove wiring, and defer to this file for the role rule itself.
public class BaulAccessTests
{
    private const string OtherUserId = "user-2";

    private static readonly Baul TestBaul =
        new(new BaulId(Guid.NewGuid()), "Familia", null, "custodio-1", 0, DateTime.UtcNow, DateTime.UtcNow);

    private static Persona MakePersona(BaulRole role, string? userId = OtherUserId, string? avatarKey = null) =>
        new(new PersonaId(Guid.NewGuid()), TestBaul.Id, userId, "Nick", role, DateTime.UtcNow, AvatarPhotoKey: avatarKey);

    // --- BaulAccess record: pure combinatorics, no service involved ---

    [Theory]
    [InlineData(BaulRole.Colaborador, false)]
    [InlineData(BaulRole.Administrador, true)]
    [InlineData(BaulRole.Custodio, true)] // a Persona row can itself be stamped Custodio (the baúl owner's own row)
    public void IsAdmin_ShouldFollowPersonaRole_ForNonCustodioMember(BaulRole role, bool expectedIsAdmin)
    {
        var access = new BaulAccess(TestBaul, IsCustodio: false, MakePersona(role));

        Assert.True(access.IsMember);
        Assert.Equal(expectedIsAdmin, access.IsAdmin);
        Assert.Equal(role, access.Role);
    }

    [Theory]
    [InlineData(BaulRole.Colaborador)]
    [InlineData(BaulRole.Administrador)]
    [InlineData(BaulRole.Custodio)]
    public void IsCustodio_ShouldGrantMemberAndAdmin_RegardlessOfAnyPersonaRole(BaulRole personaRole)
    {
        // The custodio flag comes from Baul.CustodioId, independent of whatever Persona row
        // (if any) that same user happens to also have — it must always win.
        var access = new BaulAccess(TestBaul, IsCustodio: true, MakePersona(personaRole));

        Assert.True(access.IsMember);
        Assert.True(access.IsAdmin);
        Assert.Equal(BaulRole.Custodio, access.Role);
    }

    [Fact]
    public void IsCustodio_ShouldGrantMemberAndAdmin_WithNoPersonaRowAtAll()
    {
        var access = new BaulAccess(TestBaul, IsCustodio: true, Persona: null);

        Assert.True(access.IsMember);
        Assert.True(access.IsAdmin);
        Assert.Equal(BaulRole.Custodio, access.Role);
    }

    [Fact]
    public void NonMember_ShouldDenyMembershipAndAdmin_WhenNeitherCustodioNorPersona()
    {
        var access = new BaulAccess(TestBaul, IsCustodio: false, Persona: null);

        Assert.False(access.IsMember);
        Assert.False(access.IsAdmin);
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
        var custodioPersona = MakePersona(BaulRole.Custodio, TestBaul.CustodioId);
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
        repo.GetPersonaByUserIdAsync(TestBaul.Id, OtherUserId).Returns(persona);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var access = await service.GetAsync(TestBaul, OtherUserId);

        Assert.False(access.IsCustodio);
        Assert.Equal(persona, access.Persona);
        Assert.True(access.IsMember);
        Assert.False(access.IsAdmin);
    }

    // --- BaulAccessService.AuthorizeAsync: the resolve -> authorize -> log sequence ---

    [Fact]
    public async Task AuthorizeAsync_ShouldFail_WhenBaulDoesNotExist()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetByIdAsync(TestBaul.Id).Returns((Baul?)null);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var result = await service.AuthorizeAsync(TestBaul.Id, OtherUserId, AccessLevel.Member, "Test op", new { });

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error);
    }

    [Fact]
    public async Task AuthorizeAsync_ShouldFail_ForMemberLevel_WhenCallerHasNoRelationToBaul()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetByIdAsync(TestBaul.Id).Returns(TestBaul);
        repo.GetPersonaByUserIdAsync(TestBaul.Id, OtherUserId).Returns((Persona?)null);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var result = await service.AuthorizeAsync(TestBaul.Id, OtherUserId, AccessLevel.Member, "Test op", new { });

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task AuthorizeAsync_ShouldFail_ForAdminLevel_WhenMemberIsOnlyColaborador()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetByIdAsync(TestBaul.Id).Returns(TestBaul);
        repo.GetPersonaByUserIdAsync(TestBaul.Id, OtherUserId).Returns(MakePersona(BaulRole.Colaborador));
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var result = await service.AuthorizeAsync(TestBaul.Id, OtherUserId, AccessLevel.Admin, "Test op", new { });

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task AuthorizeAsync_ShouldSucceed_ForMemberLevel_WhenColaborador()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetByIdAsync(TestBaul.Id).Returns(TestBaul);
        var persona = MakePersona(BaulRole.Colaborador);
        repo.GetPersonaByUserIdAsync(TestBaul.Id, OtherUserId).Returns(persona);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var result = await service.AuthorizeAsync(TestBaul.Id, OtherUserId, AccessLevel.Member, "Test op", new { });

        Assert.True(result.IsSuccess);
        Assert.Equal(persona, result.Value.Persona);
    }

    [Fact]
    public async Task AuthorizeAsync_ShouldSucceed_ForAdminLevel_WhenAdministrador()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetByIdAsync(TestBaul.Id).Returns(TestBaul);
        repo.GetPersonaByUserIdAsync(TestBaul.Id, OtherUserId).Returns(MakePersona(BaulRole.Administrador));
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var result = await service.AuthorizeAsync(TestBaul.Id, OtherUserId, AccessLevel.Admin, "Test op", new { });

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task AuthorizeAsync_ShouldSucceed_ForAdminLevel_WhenCustodio()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetByIdAsync(TestBaul.Id).Returns(TestBaul);
        repo.GetPersonaByUserIdAsync(TestBaul.Id, TestBaul.CustodioId).Returns((Persona?)null);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var result = await service.AuthorizeAsync(TestBaul.Id, TestBaul.CustodioId, AccessLevel.Admin, "Test op", new { });

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task AuthorizeAsync_WithPreloadedBaul_ShouldSkipTheRepositoryLookup()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetPersonaByUserIdAsync(TestBaul.Id, OtherUserId).Returns(MakePersona(BaulRole.Colaborador));
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var result = await service.AuthorizeAsync(TestBaul, OtherUserId, AccessLevel.Member, "Test op", new { });

        Assert.True(result.IsSuccess);
        await repo.DidNotReceive().GetByIdAsync(Arg.Any<BaulId>());
    }

    // --- BaulAccessService.GetAuthorInfoAsync: persona-facing display identity ---

    [Fact]
    public async Task GetAuthorInfoAsync_ShouldReturnDefaultNickname_AndNullAvatar_WhenNoPersonaExists()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetPersonaByUserIdAsync(TestBaul.Id, OtherUserId).Returns((Persona?)null);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var info = await service.GetAuthorInfoAsync(TestBaul.Id, OtherUserId, new FakePhotoStorage());

        Assert.Equal("Usuario", info.Nickname);
        Assert.Null(info.AvatarUrl);
        Assert.Null(info.PersonaId);
    }

    [Fact]
    public async Task GetAuthorInfoAsync_ShouldReturnPersonaNickname_WithNullAvatar_WhenPersonaHasNoAvatarKey()
    {
        var repo = Substitute.For<IBaulRepository>();
        var persona = MakePersona(BaulRole.Colaborador);
        repo.GetPersonaByUserIdAsync(TestBaul.Id, OtherUserId).Returns(persona);
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var info = await service.GetAuthorInfoAsync(TestBaul.Id, OtherUserId, new FakePhotoStorage());

        Assert.Equal(persona.Nickname, info.Nickname);
        Assert.Null(info.AvatarUrl);
        Assert.Equal(persona.Id.ToString(), info.PersonaId);
    }

    [Fact]
    public async Task GetAuthorInfoAsync_ShouldResolveAvatarUrl_WhenPersonaHasAnAvatarKey()
    {
        var repo = Substitute.For<IBaulRepository>();
        repo.GetPersonaByUserIdAsync(TestBaul.Id, OtherUserId).Returns(MakePersona(BaulRole.Colaborador, avatarKey: "avatar-key"));
        var service = new BaulAccessService(repo, NullLogger<BaulAccessService>.Instance);

        var info = await service.GetAuthorInfoAsync(TestBaul.Id, OtherUserId, new FakePhotoStorage());

        Assert.Equal("https://imgproxy.test/PersonaAvatar/avatar-key", info.AvatarUrl);
    }
}
