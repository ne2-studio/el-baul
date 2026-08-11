using ElBaul.Application.Bauls;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Users;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class BaulManagerTests
{
    private const string CustodioId = "custodio-1";
    private const string OtherUserId = "user-2";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryUserRepository _userRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();

    public BaulManagerTests()
    {
        _userRepository.Seed(new User(new UserId(CustodioId), "custodio@test.com", "Custodio", _clock.UtcNow()));
        _userRepository.Seed(new User(new UserId(OtherUserId), "other@test.com", "Other", _clock.UtcNow()));
    }

    private BaulManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(NullLogger<BaulManager>.Instance, _baulRepository, _photoRepository,
            _userRepository, _photoStorage,
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), _clock, new StaticCurrentUserProvider(currentUserId),
            new BaulAccessService(_baulRepository, NullLogger<BaulAccessService>.Instance));

    // Custodians now have a real Personas row (created by BaulManager.CreateAsync);
    // tests that seed the Baul directly via the repository need to add it themselves.
    private async Task<Baul> SeedBaulAsync(
        Guid baulId, string name, string? description = null, string custodioId = CustodioId,
        DateTime? createdAt = null, DateTime? updatedAt = null)
    {
        var created = createdAt ?? _clock.UtcNow();
        var baul = new Baul(new BaulId(baulId), name, description, new UserId(custodioId), 0, created, updatedAt ?? created);
        await _baulRepository.CreateAsync(baul);
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(custodioId), "Custodio", BaulRole.Custodio, created));
        return baul;
    }

    [Fact]
    public async Task CreateAsync_ShouldCreateBaulOwnedByCurrentUser()
    {
        var manager = CreateManager(CustodioId);

        var result = await manager.CreateAsync("Familia", "desc");

        Assert.True(result.IsSuccess);
        Assert.Equal("Familia", result.Value.Name);
        Assert.Equal("custodio", result.Value.Role);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldFail_WhenBaulDoesNotExist()
    {
        var manager = CreateManager(CustodioId);

        var result = await manager.GetByIdAsync(new BaulId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error.Message);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldDenyAccess_WhenUserHasNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var manager = CreateManager(OtherUserId);

        var result = await manager.GetByIdAsync(new BaulId(baulId));

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldSucceed_ForPersona_WithTheirRole()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(OtherUserId), "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetByIdAsync(new BaulId(baulId));

        Assert.True(result.IsSuccess);
        Assert.Equal("colaborador", result.Value.Role);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldSetCoverPhotoKey_ForCustodio()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "photo-key", null, new UserId(CustodioId), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(new BaulId(baulId), new PhotoId(photoId));

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value.CoverPhotoUrl);

        var baul = await _baulRepository.GetByIdAsync(new BaulId(baulId));
        Assert.Equal("photo-key", baul!.CoverPhotoKey);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldDenyAccess_WhenCallerIsNotAdmin()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "photo-key", null, new UserId(CustodioId), _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.SetCoverAsync(new BaulId(baulId), new PhotoId(photoId));

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldFail_WhenPhotoDoesNotExist()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(new BaulId(baulId), new PhotoId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error.Message);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldFail_WhenPhotoBelongsToDifferentBaul()
    {
        var baulId = Guid.NewGuid();
        var otherBaulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.CreateAsync(new Baul(new BaulId(otherBaulId), "Otro", null, new UserId(CustodioId), 0, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(otherBaulId), "photo-key", null, new UserId(CustodioId), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(new BaulId(baulId), new PhotoId(photoId));

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error.Message);
    }

    [Fact]
    public async Task UpdateAsync_ShouldUpdateNameAndDescription_ForCustodio()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia", "desc vieja");

        var manager = CreateManager(CustodioId);
        var result = await manager.UpdateAsync(new BaulId(baulId), "Familia 2024", "desc nueva");

        Assert.True(result.IsSuccess);
        Assert.Equal("Familia 2024", result.Value.Name);
        Assert.Equal("desc nueva", result.Value.Description);

        var baul = await _baulRepository.GetByIdAsync(new BaulId(baulId));
        Assert.Equal("Familia 2024", baul!.Name);
        Assert.Equal("desc nueva", baul.Description);
    }

    [Fact]
    public async Task UpdateAsync_ShouldFail_WhenBaulDoesNotExist()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.UpdateAsync(new BaulId(Guid.NewGuid()), "Familia 2024", null);

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error.Message);
    }

    [Fact]
    public async Task GetAllForCurrentUserAsync_ShouldIncludeCustodio_InMemberCount_ForOwnedBaul()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(OtherUserId), "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetAllForCurrentUserAsync();

        Assert.True(result.IsSuccess);
        var dto = result.Value.Single();
        Assert.Equal(2, dto.MemberCount); // custodio + 1 persona
    }

    [Fact]
    public async Task GetAllForCurrentUserAsync_ShouldReturnCorrectMemberCount_ForBaulSharedWithCaller()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(OtherUserId), "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetAllForCurrentUserAsync();

        Assert.True(result.IsSuccess);
        var dto = result.Value.Single();
        Assert.Equal(2, dto.MemberCount); // custodio + the caller themself
    }

    [Fact]
    public async Task GetAllForCurrentUserAsync_ShouldSortByUpdatedAt_MostRecentFirst()
    {
        var olderBaulId = Guid.NewGuid();
        var newerBaulId = Guid.NewGuid();
        var older = _clock.UtcNow().AddDays(-2);
        var newer = _clock.UtcNow();
        await SeedBaulAsync(olderBaulId, "Antiguo", createdAt: older, updatedAt: older);
        await SeedBaulAsync(newerBaulId, "Reciente", createdAt: newer, updatedAt: newer);

        var manager = CreateManager(CustodioId);
        var result = await manager.GetAllForCurrentUserAsync();

        Assert.True(result.IsSuccess);
        var ids = result.Value.Select(d => d.Id).ToList();
        Assert.Equal([newerBaulId.ToString(), olderBaulId.ToString()], ids);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldIncludeCustodio_InMemberCount_ForNonCustodioCaller()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(OtherUserId), "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetByIdAsync(new BaulId(baulId));

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.MemberCount);
    }

}
