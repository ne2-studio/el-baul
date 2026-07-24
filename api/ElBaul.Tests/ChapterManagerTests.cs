using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Tests;

public class ChapterManagerTests
{
    private const string CustodioId = "custodio-1";
    private const string StrangerId = "stranger";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();

    private ChapterManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(NullLogger<ChapterManager>.Instance, _chapterRepository, _baulRepository, _photoRepository,
            _recuerdoRepository, _photoStorage,
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), _clock, new StaticCurrentUserProvider(currentUserId),
            new BaulAccessService(_baulRepository, NullLogger<BaulAccessService>.Instance));

    [Fact]
    public async Task CreateAsync_ShouldIncrementBaulChapterCount()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateAsync(baulId, "Vacaciones");

        Assert.True(result.IsSuccess);
        var baul = await _baulRepository.GetByIdAsync(new BaulId(baulId));
        Assert.Equal(1, baul!.ChapterCount);
    }

    [Fact]
    public async Task CreateAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(StrangerId);
        var result = await manager.CreateAsync(baulId, "Vacaciones");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task CreateAsync_ShouldAllow_ForColaboradorRole()
    {
        var baulId = Guid.NewGuid();
        const string colaboradorId = "colaborador-1";
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), colaboradorId, "Colaborador", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.CreateAsync(baulId, "Vacaciones");

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task GetByBaulIdAsync_ShouldDenyAccess_WhenUserHasNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(StrangerId);
        var result = await manager.GetByBaulIdAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task GetByBaulIdAsync_ShouldResolveSignedUrls_ForCoverPhotos()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 1, "cover-key", _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetByBaulIdAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Contains("cover-key", result.Value.Single().CoverPhotoUrl);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldSetCoverPhotoKey_ForCustodio()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "photo-key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(chapterId, photoId);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value.CoverPhotoUrl);

        var chapter = await _chapterRepository.GetByIdAsync(new ChapterId(chapterId));
        Assert.Equal("photo-key", chapter!.CoverPhotoKey);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldAllow_ForColaboradorRole()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        const string colaboradorId = "colaborador-1";
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), colaboradorId, "Colaborador", BaulRole.Colaborador, _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "photo-key", null, colaboradorId, _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.SetCoverAsync(chapterId, photoId);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "photo-key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(StrangerId);
        var result = await manager.SetCoverAsync(chapterId, photoId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldFail_WhenPhotoDoesNotExist()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(chapterId, Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldFail_WhenPhotoBelongsToDifferentChapter()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var otherChapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(otherChapterId), new BaulId(baulId), "Otro chapter", 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(otherChapterId), new BaulId(baulId), "photo-key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(chapterId, photoId);

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error);
    }

    [Fact]
    public async Task UpdateAsync_ShouldUpdateName_ForCustodio()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.UpdateAsync(chapterId, "Vacaciones 2024");

        Assert.True(result.IsSuccess);
        Assert.Equal("Vacaciones 2024", result.Value.Name);

        var chapter = await _chapterRepository.GetByIdAsync(new ChapterId(chapterId));
        Assert.Equal("Vacaciones 2024", chapter!.Name);
    }

    [Fact]
    public async Task UpdateAsync_ShouldAllow_ForColaboradorRole()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        const string colaboradorId = "colaborador-1";
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), colaboradorId, "Colaborador", BaulRole.Colaborador, _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.UpdateAsync(chapterId, "Vacaciones 2024");

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task UpdateAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(StrangerId);
        var result = await manager.UpdateAsync(chapterId, "Vacaciones 2024");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task UpdateAsync_ShouldFail_WhenChapterDoesNotExist()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.UpdateAsync(Guid.NewGuid(), "Vacaciones 2024");

        Assert.True(result.IsFailure);
        Assert.Equal("Chapter not found", result.Error);
    }

    [Fact]
    public async Task GetByBaulIdAsync_ShouldCountRecuerdos_RegardlessOfPhotoAssociation()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "k1", null, CustodioId, _clock.UtcNow()));

        // Photo-attached recuerdo, plus a chapter-level one with no photo at all — both
        // must count (this used to only count recuerdos joined through the chapter's
        // currently-active photos, silently dropping photo-less ones).
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), CustodioId, "con foto", _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, new ChapterId(chapterId), new BaulId(baulId), CustodioId, "sin foto", _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetByBaulIdAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Single().RecuerdoCount);
    }

    [Fact]
    public async Task GetByBaulIdAsync_ShouldComputeDateRangeAndUndatedCount()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 3, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), new ChapterId(chapterId), new BaulId(baulId), "k1", PhotoDates.Of(2020, 5, 10), CustodioId, _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), new ChapterId(chapterId), new BaulId(baulId), "k2", PhotoDates.Of(2018, null, null), CustodioId, _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), new ChapterId(chapterId), new BaulId(baulId), "k3", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetByBaulIdAsync(baulId);

        Assert.True(result.IsSuccess);
        var dto = result.Value.Single();
        Assert.Equal(2018, dto.MinDateYear);
        Assert.Null(dto.MinDateMonth);
        Assert.Equal(2020, dto.MaxDateYear);
        Assert.Equal(5, dto.MaxDateMonth);
        Assert.Equal(10, dto.MaxDateDay);
        Assert.Equal(1, dto.UndatedPhotoCount);
    }

    [Fact]
    public async Task GetByBaulIdAsync_ShouldSortChaptersChronologically_OldestFirst_UndatedLast()
    {
        var baulId = Guid.NewGuid();
        var olderChapterId = Guid.NewGuid();
        var recentChapterId = Guid.NewGuid();
        var undatedChapterId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(olderChapterId), new BaulId(baulId), "Antiguo", 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(recentChapterId), new BaulId(baulId), "Reciente", 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(undatedChapterId), new BaulId(baulId), "Sin fecha", 0, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), new ChapterId(olderChapterId), new BaulId(baulId), "k1", PhotoDates.Of(2015, null, null), CustodioId, _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), new ChapterId(recentChapterId), new BaulId(baulId), "k2", PhotoDates.Of(2022, null, null), CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetByBaulIdAsync(baulId);

        Assert.True(result.IsSuccess);
        var ids = result.Value.Select(a => a.Id).ToList();
        Assert.Equal([olderChapterId.ToString(), recentChapterId.ToString(), undatedChapterId.ToString()], ids);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldCreateRecuerdoWithNoPhoto()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(chapterId, "Que buen viaje");

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.PhotoId);
        Assert.True(result.Value.IsOwn);
        Assert.Equal("Que buen viaje", result.Value.Text);

        var stored = (await _recuerdoRepository.GetByChapterIdAsync(new ChapterId(chapterId))).Single();
        Assert.Null(stored.PhotoId);
        Assert.Equal(new ChapterId(chapterId), stored.ChapterId);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldAllow_ForColaboradorRole()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        const string colaboradorId = "colaborador-1";
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), colaboradorId, "Colaborador", BaulRole.Colaborador, _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.CreateRecuerdoAsync(chapterId, "Recuerdo de un colaborador");

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldIncludeAuthorsAvatarUrl_WhenPersonaHasOne()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        const string colaboradorId = "colaborador-1";
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), colaboradorId, "Colaborador", BaulRole.Colaborador, _clock.UtcNow(),
            AvatarPhotoKey: "avatar-key"));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.CreateRecuerdoAsync(chapterId, "Recuerdo de un colaborador");

        Assert.True(result.IsSuccess);
        Assert.Equal("https://imgproxy.test/PersonaAvatar/avatar-key", result.Value.UserAvatar);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldDenyAccess_WhenUserHasNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(StrangerId);
        var result = await manager.CreateRecuerdoAsync(chapterId, "No debería poder");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldFail_WhenChapterDoesNotExist()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(Guid.NewGuid(), "texto");

        Assert.True(result.IsFailure);
        Assert.Equal("Chapter not found", result.Error);
    }

    [Fact]
    public async Task GetRecuerdosAsync_ShouldReturnFeedNewestFirst_WithPhotoThumbnailWhenPresent()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "photo-key", null, CustodioId, _clock.UtcNow()));

        var older = _clock.UtcNow().AddDays(-1);
        var newer = _clock.UtcNow();
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, new ChapterId(chapterId), new BaulId(baulId), CustodioId, "sin foto, más antiguo", older));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), CustodioId, "con foto, más reciente", newer));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetRecuerdosAsync(chapterId);

        Assert.True(result.IsSuccess);
        var list = result.Value.ToList();
        Assert.Equal(["con foto, más reciente", "sin foto, más antiguo"], list.Select(r => r.Text));

        var withPhoto = list.Single(r => r.Text == "con foto, más reciente");
        Assert.Equal(photoId.ToString(), withPhoto.PhotoId);
        Assert.Contains("photo-key", withPhoto.PhotoThumbnailUrl);

        var withoutPhoto = list.Single(r => r.Text == "sin foto, más antiguo");
        Assert.Null(withoutPhoto.PhotoId);
        Assert.Null(withoutPhoto.PhotoThumbnailUrl);
    }

    [Fact]
    public async Task GetRecuerdosAsync_ShouldDenyAccess_WhenUserHasNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(StrangerId);
        var result = await manager.GetRecuerdosAsync(chapterId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task DeleteAsync_ShouldRemoveChapter_AndLoosenItsPhotosAndRecuerdos_ForCustodio()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 1, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), CustodioId, "Custodio", BaulRole.Custodio, _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), CustodioId, "con foto", _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, new ChapterId(chapterId), new BaulId(baulId), CustodioId, "sin foto", _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.DeleteAsync(chapterId);

        Assert.True(result.IsSuccess);
        Assert.Null(await _chapterRepository.GetByIdAsync(new ChapterId(chapterId)));

        var photo = await _photoRepository.GetByIdAsync(new PhotoId(photoId));
        Assert.Null(photo!.ChapterId);
        Assert.Equal(baulId, photo.BaulId);

        var recuerdos = (await _recuerdoRepository.GetByBaulIdAsync(new BaulId(baulId))).ToList();
        Assert.Equal(2, recuerdos.Count);
        Assert.All(recuerdos, r => Assert.Null(r.ChapterId));

        var baul = await _baulRepository.GetByIdAsync(new BaulId(baulId));
        Assert.Equal(0, baul!.ChapterCount);
    }

    [Fact]
    public async Task DeleteAsync_ShouldDenyAccess_ForColaboradorRole()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        const string colaboradorId = "colaborador-1";
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 1, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), colaboradorId, "Colaborador", BaulRole.Colaborador, _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.DeleteAsync(chapterId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
        Assert.NotNull(await _chapterRepository.GetByIdAsync(new ChapterId(chapterId)));
    }

    [Fact]
    public async Task DeleteAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 1, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(StrangerId);
        var result = await manager.DeleteAsync(chapterId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
    }

    [Fact]
    public async Task DeleteAsync_ShouldFail_WhenChapterDoesNotExist()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.DeleteAsync(Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("Chapter not found", result.Error);
    }
}
