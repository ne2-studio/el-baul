using ElBaul.Application.Bauls;
using ElBaul.Application.Personas;
using ElBaul.Application.Recuerdos;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Users;
using Ne2Studio.Common;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class RecuerdoManagerTests
{
    private const string CustodioId = "custodio-1";
    private const string OtherUserId = "user-2";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly InMemoryRecuerdoEmbeddingRepository _recuerdoEmbeddingRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();

    private RecuerdoManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(NullLogger<RecuerdoManager>.Instance, _chapterRepository, _photoRepository, _recuerdoRepository,
            new InMemoryRecuerdoListReadModel(_recuerdoRepository, _photoRepository, _chapterRepository),
            _recuerdoEmbeddingRepository, new StaticIdGenerator(nextId ?? Guid.NewGuid()), _clock,
            new StaticCurrentUserProvider(currentUserId), _photoStorage,
            new BaulAccessService(_baulRepository, NullLogger<BaulAccessService>.Instance),
            new AuthorInfoProjector(_baulRepository, _photoRepository, _photoStorage));

    private async Task<(Guid baulId, Guid chapterId)> SeedBaulWithChapterAsync()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, new UserId(CustodioId), 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(CustodioId), "Custodio", BaulRole.Custodio, _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));
        return (baulId, chapterId);
    }

    // Custodians now have a real Personas row (created by BaulManager.CreateAsync);
    // tests that seed the Baul directly via the repository need to add it themselves.
    private async Task<Baul> SeedBaulAsync(Guid baulId, string name, string custodioId = CustodioId)
    {
        var baul = new Baul(new BaulId(baulId), name, null, new UserId(custodioId), 0, _clock.UtcNow(), _clock.UtcNow());
        await _baulRepository.CreateAsync(baul);
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(custodioId), "Custodio", BaulRole.Custodio, _clock.UtcNow()));
        return baul;
    }

    // --- Photo-scoped ------------------------------------------------------------------

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldStampIsOwn_ForTheAuthor()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, new UserId(CustodioId), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(new PhotoId(photoId), "Que buen recuerdo");

        Assert.True(result.IsSuccess);
        Assert.True(result.Value.IsOwn);
        Assert.Equal("Custodio", result.Value.UserName);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldUsePersonaNickname_ForTheAuthorName()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, new UserId(CustodioId), _clock.UtcNow()));
        const string colaboradorId = "colaborador-1";
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(colaboradorId), "Tito Recuerdos", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.CreateRecuerdoAsync(new PhotoId(photoId), "Que buen recuerdo");

        Assert.True(result.IsSuccess);
        Assert.Equal("Tito Recuerdos", result.Value.UserName);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldIncludeAuthorsAvatarUrl_WhenPersonaHasOne()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, new UserId(CustodioId), _clock.UtcNow()));
        const string colaboradorId = "colaborador-1";
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(colaboradorId), "Tito Recuerdos", BaulRole.Colaborador, _clock.UtcNow(),
            AvatarPhotoKey: "avatar-key"));

        var manager = CreateManager(colaboradorId);
        var result = await manager.CreateRecuerdoAsync(new PhotoId(photoId), "Que buen recuerdo");

        Assert.True(result.IsSuccess);
        Assert.Equal("https://imgproxy.test/PersonaAvatar/avatar-key", result.Value.UserAvatar);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldLeaveAvatarNull_WhenPersonaHasNone()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, new UserId(CustodioId), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(new PhotoId(photoId), "Que buen recuerdo");

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.UserAvatar);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldSetChapterId_FromThePhotosChapter()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, new UserId(CustodioId), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(new PhotoId(photoId), "Que buen recuerdo");

        Assert.True(result.IsSuccess);
        var stored = (await _recuerdoRepository.GetByPhotoIdAsync(new PhotoId(photoId))).Single();
        Assert.Equal(new ChapterId(chapterId), stored.ChapterId);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldLeaveChapterIdNull_ForLoosePhoto()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, new UserId(CustodioId), 0, _clock.UtcNow(), _clock.UtcNow()));
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), null, new BaulId(baulId), "key", null, new UserId(CustodioId), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(new PhotoId(photoId), "Foto suelta");

        Assert.True(result.IsSuccess);
        var stored = (await _recuerdoRepository.GetByPhotoIdAsync(new PhotoId(photoId))).Single();
        Assert.Null(stored.ChapterId);
    }

    [Fact]
    public async Task GetRecuerdosAsync_ShouldResolveTheSameAuthor_ForEveryOneOfTheirRecuerdos()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        const string colaboradorId = "colaborador-1";
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(colaboradorId), "Tito Recuerdos", BaulRole.Colaborador, _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, new ChapterId(chapterId), new BaulId(baulId), new UserId(colaboradorId), "primero", _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, new ChapterId(chapterId), new BaulId(baulId), new UserId(colaboradorId), "segundo", _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, new ChapterId(chapterId), new BaulId(baulId), new UserId(CustodioId), "de otro autor", _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetRecuerdosAsync(new ChapterId(chapterId));

        Assert.True(result.IsSuccess);
        var list = result.Value.ToList();
        Assert.All(list.Where(r => r.Text is "primero" or "segundo"), r => Assert.Equal("Tito Recuerdos", r.UserName));
        Assert.Equal("Custodio", list.Single(r => r.Text == "de otro autor").UserName);
    }

    [Fact]
    public async Task GetRecuerdosAsync_ShouldMarkIsOwn_OnlyForCurrentUsersEntries()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, new UserId(CustodioId), _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), new UserId(CustodioId), "mine", _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), new UserId("other-user"), "not mine", _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetRecuerdosAsync(new PhotoId(photoId));

        Assert.True(result.IsSuccess);
        var list = result.Value.ToList();
        Assert.True(list.Single(r => r.Text == "mine").IsOwn);
        Assert.False(list.Single(r => r.Text == "not mine").IsOwn);
    }

    // --- Chapter-scoped ----------------------------------------------------------------

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldCreateRecuerdoWithNoPhoto()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, new UserId(CustodioId), 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(new ChapterId(chapterId), "Que buen viaje");

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
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, new UserId(CustodioId), 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(colaboradorId), "Colaborador", BaulRole.Colaborador, _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.CreateRecuerdoAsync(new ChapterId(chapterId), "Recuerdo de un colaborador");

        Assert.True(result.IsSuccess);
    }

    // Author-info resolution (nickname/avatar) is shared internal logic now, not repeated per
    // scope — see CreateRecuerdoAsync_ShouldIncludeAuthorsAvatarUrl_WhenPersonaHasOne above for
    // the one test that covers it regardless of which scoped entry point is called.

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldFail_WhenChapterDoesNotExist()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(new ChapterId(Guid.NewGuid()), "texto");

        Assert.True(result.IsFailure);
        Assert.Equal("Chapter not found", result.Error.Message);
    }

    [Fact]
    public async Task GetRecuerdosAsync_ShouldReturnFeedNewestFirst_WithPhotoThumbnailWhenPresent()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, new UserId(CustodioId), 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "photo-key", null, new UserId(CustodioId), _clock.UtcNow()));

        var older = _clock.UtcNow().AddDays(-1);
        var newer = _clock.UtcNow();
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, new ChapterId(chapterId), new BaulId(baulId), new UserId(CustodioId), "sin foto, más antiguo", older));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), new UserId(CustodioId), "con foto, más reciente", newer));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetRecuerdosAsync(new ChapterId(chapterId));

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
    public async Task GetRecuerdosAsync_ShouldResolveEachRecuerdosThumbnail_FromItsOwnPhoto()
    {
        // Targets BuildThumbnailUrlsAsync's batched IPhotoRepository.GetByIdsAsync lookup
        // specifically: two recuerdos on two different photos must each get their own photo's
        // thumbnail — the exact mistake a broken dictionary lookup in the batching would
        // produce is one recuerdo's thumbnail leaking onto another's DTO.
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var firstPhotoId = Guid.NewGuid();
        var secondPhotoId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, new UserId(CustodioId), 0, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 2, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(firstPhotoId), new ChapterId(chapterId), new BaulId(baulId), "first-key", null, new UserId(CustodioId), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(secondPhotoId), new ChapterId(chapterId), new BaulId(baulId), "second-key", null, new UserId(CustodioId), _clock.UtcNow()));

        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), new PhotoId(firstPhotoId), new ChapterId(chapterId), new BaulId(baulId), new UserId(CustodioId), "de la primera foto", _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), new PhotoId(secondPhotoId), new ChapterId(chapterId), new BaulId(baulId), new UserId(CustodioId), "de la segunda foto", _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetRecuerdosAsync(new ChapterId(chapterId));

        Assert.True(result.IsSuccess);
        var list = result.Value.ToList();

        var first = list.Single(r => r.Text == "de la primera foto");
        Assert.Contains("first-key", first.PhotoThumbnailUrl);

        var second = list.Single(r => r.Text == "de la segunda foto");
        Assert.Contains("second-key", second.PhotoThumbnailUrl);
    }

    // --- Baul-scoped -------------------------------------------------------------------

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldCreateStandaloneRecuerdo_WithNoPhotoOrChapter()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(new BaulId(baulId), "Un recuerdo suelto");

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.PhotoId);
        Assert.Null(result.Value.ChapterId);
        Assert.True(result.Value.IsOwn);

        var stored = (await _recuerdoRepository.GetByBaulIdAsync(new BaulId(baulId))).Single();
        Assert.Equal(baulId, stored.BaulId);
        Assert.Null(stored.PhotoId);
        Assert.Null(stored.ChapterId);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldSucceed_ForPersonaWithAccess()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(OtherUserId), "Other", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.CreateRecuerdoAsync(new BaulId(baulId), "Recuerdo de un miembro");

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldFail_WhenBaulNotFound()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(new BaulId(Guid.NewGuid()), "texto");

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error.Message);
    }

    [Fact]
    public async Task GetRecuerdosAsync_ShouldReturnMixedFeed_NewestFirst_WithProvenance()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Vacaciones", 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "photo-key", null, new UserId(CustodioId), _clock.UtcNow()));

        var oldest = _clock.UtcNow().AddDays(-2);
        var middle = _clock.UtcNow().AddDays(-1);
        var newest = _clock.UtcNow();
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baulId), new UserId(CustodioId), "suelto", oldest));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, new ChapterId(chapterId), new BaulId(baulId), new UserId(CustodioId), "de capítulo", middle));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), new UserId(CustodioId), "de foto", newest));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetRecuerdosAsync(new BaulId(baulId));

        Assert.True(result.IsSuccess);
        var list = result.Value.ToList();
        Assert.Equal(["de foto", "de capítulo", "suelto"], list.Select(r => r.Text));

        var photoRecuerdo = list.Single(r => r.Text == "de foto");
        Assert.Equal(photoId.ToString(), photoRecuerdo.PhotoId);
        Assert.NotNull(photoRecuerdo.PhotoThumbnailUrl);

        var chapterRecuerdo = list.Single(r => r.Text == "de capítulo");
        Assert.Null(chapterRecuerdo.PhotoId);
        Assert.Equal(chapterId.ToString(), chapterRecuerdo.ChapterId);
        Assert.Equal("Vacaciones", chapterRecuerdo.ChapterName);

        var standaloneRecuerdo = list.Single(r => r.Text == "suelto");
        Assert.Null(standaloneRecuerdo.PhotoId);
        Assert.Null(standaloneRecuerdo.ChapterId);
    }

    [Fact]
    public async Task GetRecuerdosAsync_ShouldResolveEachRecuerdosChapterName_FromItsOwnChapter()
    {
        // Targets the baúl-scoped listing's per-chapter name resolution specifically: two
        // recuerdos in two different chapters must each get their own chapter's name — the
        // exact mistake a broken dictionary lookup in IRecuerdoListReadModel would produce is
        // one recuerdo's ChapterName leaking onto another's DTO.
        var baulId = Guid.NewGuid();
        var firstChapterId = Guid.NewGuid();
        var secondChapterId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(firstChapterId), new BaulId(baulId), "Capítulo uno", 0, null, _clock.UtcNow(), _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(secondChapterId), new BaulId(baulId), "Capítulo dos", 0, null, _clock.UtcNow(), _clock.UtcNow()));

        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, new ChapterId(firstChapterId), new BaulId(baulId), new UserId(CustodioId), "del uno", _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, new ChapterId(secondChapterId), new BaulId(baulId), new UserId(CustodioId), "del dos", _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetRecuerdosAsync(new BaulId(baulId));

        Assert.True(result.IsSuccess);
        var list = result.Value.ToList();
        Assert.Equal("Capítulo uno", list.Single(r => r.Text == "del uno").ChapterName);
        Assert.Equal("Capítulo dos", list.Single(r => r.Text == "del dos").ChapterName);
    }

    [Fact]
    public async Task GetRecuerdosAsync_ShouldFail_WhenBaulNotFound()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.GetRecuerdosAsync(new BaulId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error.Message);
    }

    // --- Updates ----------------------------------------------------------------------

    [Fact]
    public async Task UpdateRecuerdoAsync_ShouldUpdateOnlyText_ForTheAuthor()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        var photoId = Guid.NewGuid();
        var recuerdoId = Guid.NewGuid();
        var createdAt = _clock.UtcNow().AddDays(-3);
        await SeedBaulAsync(baulId, "Familia");
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 1, null, _clock.UtcNow(), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "photo-key", null, new UserId(CustodioId), _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(
            new RecuerdoId(recuerdoId), new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), new UserId(CustodioId), "texto viejo", createdAt));

        var manager = CreateManager(CustodioId);
        var result = await manager.UpdateRecuerdoAsync(new RecuerdoId(recuerdoId), "  texto nuevo  ");

        Assert.True(result.IsSuccess);
        Assert.Equal("texto nuevo", result.Value.Text);
        Assert.True(result.Value.IsOwn);
        Assert.Equal("Chapter", result.Value.ChapterName);
        Assert.Contains("photo-key", result.Value.PhotoThumbnailUrl);

        var stored = await _recuerdoRepository.GetByIdAsync(new RecuerdoId(recuerdoId));
        Assert.NotNull(stored);
        Assert.Equal("texto nuevo", stored.Text);
        Assert.Equal(new PhotoId(photoId), stored.PhotoId);
        Assert.Equal(new ChapterId(chapterId), stored.ChapterId);
        Assert.Equal(new BaulId(baulId), stored.BaulId);
        Assert.Equal(CustodioId, stored.UserId);
        Assert.Equal(createdAt, stored.CreatedAt);
    }

    [Fact]
    public async Task UpdateRecuerdoAsync_ShouldFail_WhenCurrentUserIsNotTheAuthor()
    {
        var baulId = Guid.NewGuid();
        var recuerdoId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddPersonaAsync(new Persona(
            new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(OtherUserId), "Other", BaulRole.Colaborador, _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(
            new RecuerdoId(recuerdoId), null, null, new BaulId(baulId), new UserId(CustodioId), "texto viejo", _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.UpdateRecuerdoAsync(new RecuerdoId(recuerdoId), "texto nuevo");

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.Forbidden, result.Error.Code);

        var stored = await _recuerdoRepository.GetByIdAsync(new RecuerdoId(recuerdoId));
        Assert.Equal("texto viejo", stored?.Text);
    }

    [Fact]
    public async Task UpdateRecuerdoAsync_ShouldFail_WhenCurrentUserHasNoAccessToTheBaul()
    {
        var baulId = Guid.NewGuid();
        var recuerdoId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _recuerdoRepository.CreateAsync(new Recuerdo(
            new RecuerdoId(recuerdoId), null, null, new BaulId(baulId), new UserId(CustodioId), "texto viejo", _clock.UtcNow()));

        var manager = CreateManager(OtherUserId);
        var result = await manager.UpdateRecuerdoAsync(new RecuerdoId(recuerdoId), "texto nuevo");

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.Forbidden, result.Error.Code);
    }

    [Fact]
    public async Task UpdateRecuerdoAsync_ShouldFail_WhenRecuerdoDoesNotExist()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.UpdateRecuerdoAsync(new RecuerdoId(Guid.NewGuid()), "texto");

        Assert.True(result.IsFailure);
        Assert.Equal("Recuerdo not found", result.Error.Message);
    }

    [Fact]
    public async Task UpdateRecuerdoAsync_ShouldInvalidateCachedEmbedding()
    {
        var baulId = Guid.NewGuid();
        var recuerdoId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        await _recuerdoRepository.CreateAsync(new Recuerdo(
            new RecuerdoId(recuerdoId), null, null, new BaulId(baulId), new UserId(CustodioId), "texto viejo", _clock.UtcNow()));
        await _recuerdoEmbeddingRepository.CreateManyAsync([
            new RecuerdoEmbedding(new RecuerdoId(recuerdoId), new BaulId(baulId), [1, 0], "test-model", _clock.UtcNow())
        ]);

        var manager = CreateManager(CustodioId);
        var result = await manager.UpdateRecuerdoAsync(new RecuerdoId(recuerdoId), "texto nuevo");

        Assert.True(result.IsSuccess);
        Assert.Empty(await _recuerdoEmbeddingRepository.GetByBaulIdAsync(new BaulId(baulId)));
    }
}
