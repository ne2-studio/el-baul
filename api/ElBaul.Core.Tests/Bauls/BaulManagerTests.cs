using ElBaul.Core.Bauls.Domain;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Users.Domain;
using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.Application;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Users.OutputPorts;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class BaulManagerTests
{
    private const string CustodioId = "custodio-1";
    private const string OtherUserId = "user-2";

    private readonly InMemoryPersonaRepository _personaRepository = new();
    private readonly InMemoryBaulRepository _baulRepository;
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryUserRepository _userRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();

    public BaulManagerTests()
    {
        _baulRepository = new InMemoryBaulRepository(_personaRepository);
        _userRepository.Seed(new User(new UserId(CustodioId), "custodio@test.com", "Custodio", _clock.UtcNow()));
        _userRepository.Seed(new User(new UserId(OtherUserId), "other@test.com", "Other", _clock.UtcNow()));
    }

    private BaulManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(NullLogger<BaulManager>.Instance, _baulRepository, _personaRepository, _photoRepository,
            _userRepository, new CoverUrlResolver(_photoStorage),
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), _clock, new StaticCurrentUserProvider(currentUserId),
            new BaulAccessService(_baulRepository, _personaRepository, NullLogger<BaulAccessService>.Instance), new FakeUnitOfWork());

    // Custodians now have a real Personas row (created by BaulManager.CreateAsync);
    // tests that seed the Baul directly via the repository need to add it themselves.
    private async Task<Baul> SeedBaulAsync(
        Guid baulId, string name, string? description = null, string custodioId = CustodioId,
        DateTime? createdAt = null, DateTime? updatedAt = null)
    {
        var created = createdAt ?? _clock.UtcNow();
        var baul = new Baul(new BaulId(baulId), name, description, new UserId(custodioId), 0, created, updatedAt ?? created);
        await _baulRepository.CreateAsync(baul);
        await _personaRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(custodioId), "Custodio", BaulRole.Administrador, created));
        return baul;
    }

    [Fact]
    public async Task CreateAsync_ShouldCreateBaulOwnedByCurrentUser()
    {
        var manager = CreateManager(CustodioId);

        var result = await manager.CreateAsync("Familia", "desc");

        Assert.True(result.IsSuccess);
        Assert.Equal("Familia", result.Value.Name);
        Assert.Equal("administrador", result.Value.Role);
        Assert.True(result.Value.IsCustodio);
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
        await _personaRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(OtherUserId), "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetByIdAsync(new BaulId(baulId));

        Assert.True(result.IsSuccess);
        Assert.Equal("colaborador", result.Value.Role);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldSetCoverPhotoId_ForCustodio()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _photoRepository.CreateAsync(PhotoMother.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "photo-key", null, new UserId(CustodioId), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(new BaulId(baulId), new PhotoId(photoId), new ImageCrop(0.25m, 0.75m, 1.8m));

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value.CoverPhotoUrl);
        Assert.Equal(0.25m, result.Value.CoverCropX);
        Assert.Equal(0.75m, result.Value.CoverCropY);
        Assert.Equal(1.8m, result.Value.CoverCropScale);

        var baul = await _baulRepository.GetByIdAsync(new BaulId(baulId));
        Assert.Equal(new PhotoId(photoId), baul!.CoverPhotoId);
        Assert.Equal(0.25m, baul!.CoverCrop.X);
        Assert.Equal(0.75m, baul.CoverCrop.Y);
        Assert.Equal(1.8m, baul.CoverCrop.Scale);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldDenyAccess_WhenCallerIsNotAdmin()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _photoRepository.CreateAsync(PhotoMother.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "photo-key", null, new UserId(CustodioId), _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.SetCoverAsync(new BaulId(baulId), new PhotoId(photoId), new ImageCrop(0.5m, 0.5m, 1m));

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldFail_WhenPhotoDoesNotExist()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(new BaulId(baulId), new PhotoId(Guid.NewGuid()), new ImageCrop(0.5m, 0.5m, 1m));

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
        await _photoRepository.CreateAsync(PhotoMother.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(otherBaulId), "photo-key", null, new UserId(CustodioId), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(new BaulId(baulId), new PhotoId(photoId), new ImageCrop(0.5m, 0.5m, 1m));

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
        await _personaRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(OtherUserId), "Other", BaulRole.Colaborador, _clock.UtcNow()));

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
        await _personaRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(OtherUserId), "Other", BaulRole.Colaborador, _clock.UtcNow()));

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
    public async Task GetAllForCurrentUserAsync_ShouldResolveEachBaulsOwnCover_WhenListingSeveral()
    {
        // Exercises the batched cover-photo lookup GetAllForCurrentUserAsync uses (one
        // GetByIdsAsync for every baúl in the list, not one GetByIdAsync per baúl) — each baúl
        // must still get back its own cover, not another one's or none at all.
        var firstBaulId = Guid.NewGuid();
        var secondBaulId = Guid.NewGuid();
        var firstBaul = await SeedBaulAsync(firstBaulId, "Familia 1");
        var secondBaul = await SeedBaulAsync(secondBaulId, "Familia 2");
        var firstPhoto = PhotoMother.Create(new PhotoId(Guid.NewGuid()), null, firstBaul.Id, "first-key", null, new UserId(CustodioId), _clock.UtcNow());
        var secondPhoto = PhotoMother.Create(new PhotoId(Guid.NewGuid()), null, secondBaul.Id, "second-key", null, new UserId(CustodioId), _clock.UtcNow());
        await _photoRepository.CreateAsync(firstPhoto);
        await _photoRepository.CreateAsync(secondPhoto);
        await _baulRepository.UpdateAsync(firstBaul.WithCover(firstPhoto, new ImageCrop(0.5m, 0.5m, 1m), _clock.UtcNow()));
        await _baulRepository.UpdateAsync(secondBaul.WithCover(secondPhoto, new ImageCrop(0.5m, 0.5m, 1m), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetAllForCurrentUserAsync();

        Assert.True(result.IsSuccess);
        var byId = result.Value.ToDictionary(d => d.Id);
        Assert.Contains("first-key", byId[firstBaulId.ToString()].CoverPhotoUrl);
        Assert.Contains("second-key", byId[secondBaulId.ToString()].CoverPhotoUrl);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldIncludeCustodio_InMemberCount_ForNonCustodioCaller()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _personaRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(OtherUserId), "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.GetByIdAsync(new BaulId(baulId));

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.MemberCount);
    }

}
