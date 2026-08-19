using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Personas.Application;
using ElBaul.Core.TvMode.Application;
using ElBaul.Infra.Lite;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;

using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class TvPairingManagerTests
{
    private static readonly DateTime Now = new(2026, 8, 13, 12, 0, 0, DateTimeKind.Utc);

    private readonly InMemoryTvPairingRepository _tvPairings = new();
    private readonly InMemoryTvSessionRepository _tvSessions = new();
    private readonly InMemoryPersonaRepository _personas = new();
    private readonly InMemoryBaulRepository _baules;
    private readonly StaticClock _clock = new(Now);
    private readonly StaticCurrentUserProvider _currentUser = new("user-1");
    private readonly StaticAppConfiguration _configuration = new(
        publicUrl: "https://app.el-baul.test", apiPublicUrl: "https://api.el-baul.test", tvModeEnabled: true);

    public TvPairingManagerTests()
    {
        _baules = new InMemoryBaulRepository(_personas);
    }

    [Fact]
    public async Task CreateAsync_ShouldReturnClaimUrlAndCode()
    {
        var manager = CreateManager();

        var result = await manager.CreateAsync();

        Assert.True(result.IsSuccess);
        Assert.False(string.IsNullOrWhiteSpace(result.Value.Code));
        Assert.Equal($"https://app.el-baul.test/tv/vincular/{result.Value.Code}", result.Value.ClaimUrl);
        Assert.Equal(Now.AddMinutes(10), result.Value.ExpiresAt);
    }

    [Fact]
    public async Task CreateAsync_ShouldFail_WhenTvModeDisabled()
    {
        var manager = CreateManager(tvModeEnabled: false);

        var result = await manager.CreateAsync();

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, result.Error.Code);
    }

    [Fact]
    public async Task GetStatusAsync_ShouldReportUnclaimed_UntilSomeoneClaimsIt()
    {
        var baul = await SeedBaulAsync();
        var manager = CreateManager();
        var pairing = await manager.CreateAsync();

        var beforeClaim = await manager.GetStatusAsync(pairing.Value.Code);
        Assert.True(beforeClaim.IsSuccess);
        Assert.False(beforeClaim.Value.Claimed);
        Assert.Null(beforeClaim.Value.SessionToken);

        var claimed = await manager.ClaimAsync(pairing.Value.Code, baul.Id);
        Assert.True(claimed.IsSuccess);

        var afterClaim = await manager.GetStatusAsync(pairing.Value.Code);
        Assert.True(afterClaim.IsSuccess);
        Assert.True(afterClaim.Value.Claimed);
        Assert.False(string.IsNullOrWhiteSpace(afterClaim.Value.SessionToken));
        Assert.NotNull(await _tvSessions.GetByTokenAsync(afterClaim.Value.SessionToken!));
    }

    [Fact]
    public async Task GetStatusAsync_ShouldReturnNotFound_ForUnknownCode()
    {
        var manager = CreateManager();

        var result = await manager.GetStatusAsync("does-not-exist");

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, result.Error.Code);
    }

    [Fact]
    public async Task GetStatusAsync_ShouldReturnNotFound_OnceExpired()
    {
        var manager = CreateManager();
        var pairing = await manager.CreateAsync();

        _clock.Now = Now.AddMinutes(10).AddSeconds(1);
        var result = await manager.GetStatusAsync(pairing.Value.Code);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, result.Error.Code);
    }

    [Fact]
    public async Task ClaimAsync_ShouldFail_WhenAlreadyClaimed()
    {
        var baul = await SeedBaulAsync();
        var manager = CreateManager();
        var pairing = await manager.CreateAsync();
        await manager.ClaimAsync(pairing.Value.Code, baul.Id);

        var result = await manager.ClaimAsync(pairing.Value.Code, baul.Id);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, result.Error.Code);
    }

    [Fact]
    public async Task ClaimAsync_ShouldFail_WhenCallerHasNoAccessToTheBaul()
    {
        var baul = await SeedBaulAsync();
        var manager = CreateManager(currentUser: new StaticCurrentUserProvider("stranger"));
        var pairing = await manager.CreateAsync();

        var result = await manager.ClaimAsync(pairing.Value.Code, baul.Id);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.Forbidden, result.Error.Code);
    }

    private TvPairingManager CreateManager(bool tvModeEnabled = true, ICurrentUserProvider? currentUser = null)
    {
        var configuration = tvModeEnabled
            ? _configuration
            : new StaticAppConfiguration(publicUrl: "https://app.el-baul.test", apiPublicUrl: "https://api.el-baul.test", tvModeEnabled: false);

        var tvSessionManager = new TvSessionManager(
            NullLogger<TvSessionManager>.Instance,
            _tvSessions,
            _baules,
            _personas,
            new InMemoryPhotoRepository(),
            new InMemoryChapterRepository(),
            new InMemoryPhotoPersonaTagRepository(),
            new InMemoryRecuerdoRepository(),
            new FakePhotoStorage(),
            new StaticIdGenerator(Guid.NewGuid()),
            _clock,
            currentUser ?? _currentUser,
            configuration,
            new BaulAccessService(_baules, _personas, NullLogger<BaulAccessService>.Instance),
            new AuthorInfoProjector(_personas, new InMemoryPhotoRepository(), new FakePhotoStorage()));

        return new TvPairingManager(
            NullLogger<TvPairingManager>.Instance,
            _tvPairings,
            tvSessionManager,
            new StaticIdGenerator(Guid.NewGuid()),
            _clock,
            configuration);
    }

    private async Task<Baul> SeedBaulAsync()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var baul = new Baul(baulId, "Familia Pérez", null, new UserId("user-1"), 1, Now, Now);
        await _baules.CreateAsync(baul);
        await _personas.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId("user-1"), "Pedro", BaulRole.Administrador, Now));
        return baul;
    }
}
