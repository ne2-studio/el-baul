using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Tests;

public class RecuerdoManagerTests
{
    private const string CustodioId = "custodio-1";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();

    private RecuerdoManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(NullLogger<RecuerdoManager>.Instance, _photoRepository, _recuerdoRepository,
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), _clock, new StaticCurrentUserProvider(currentUserId),
            _photoStorage, new BaulAccessService(_baulRepository, NullLogger<BaulAccessService>.Instance));

    private async Task<(Guid baulId, Guid chapterId)> SeedBaulWithChapterAsync()
    {
        var baulId = Guid.NewGuid();
        var chapterId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), CustodioId, "Custodio", BaulRole.Custodio, _clock.UtcNow()));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(chapterId), new BaulId(baulId), "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));
        return (baulId, chapterId);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldStampIsOwn_ForTheAuthor()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(photoId, "Que buen recuerdo");

        Assert.True(result.IsSuccess);
        Assert.True(result.Value.IsOwn);
        Assert.Equal("Custodio", result.Value.UserName);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldUsePersonaNickname_ForTheAuthorName()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));
        const string colaboradorId = "colaborador-1";
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), colaboradorId, "Tito Recuerdos", BaulRole.Colaborador, _clock.UtcNow()));

        var manager = CreateManager(colaboradorId);
        var result = await manager.CreateRecuerdoAsync(photoId, "Que buen recuerdo");

        Assert.True(result.IsSuccess);
        Assert.Equal("Tito Recuerdos", result.Value.UserName);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldIncludeAuthorsAvatarUrl_WhenPersonaHasOne()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));
        const string colaboradorId = "colaborador-1";
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), colaboradorId, "Tito Recuerdos", BaulRole.Colaborador, _clock.UtcNow(),
            AvatarPhotoKey: "avatar-key"));

        var manager = CreateManager(colaboradorId);
        var result = await manager.CreateRecuerdoAsync(photoId, "Que buen recuerdo");

        Assert.True(result.IsSuccess);
        Assert.Equal("https://imgproxy.test/PersonaAvatar/avatar-key", result.Value.UserAvatar);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldLeaveAvatarNull_WhenPersonaHasNone()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(photoId, "Que buen recuerdo");

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.UserAvatar);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldSetChapterId_FromThePhotosChapter()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(photoId, "Que buen recuerdo");

        Assert.True(result.IsSuccess);
        var stored = (await _recuerdoRepository.GetByPhotoIdAsync(new PhotoId(photoId))).Single();
        Assert.Equal(new ChapterId(chapterId), stored.ChapterId);
    }

    [Fact]
    public async Task CreateRecuerdoAsync_ShouldLeaveChapterIdNull_ForLoosePhoto()
    {
        var baulId = Guid.NewGuid();
        await _baulRepository.CreateAsync(new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, _clock.UtcNow(), _clock.UtcNow()));
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), null, new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateRecuerdoAsync(photoId, "Foto suelta");

        Assert.True(result.IsSuccess);
        var stored = (await _recuerdoRepository.GetByPhotoIdAsync(new PhotoId(photoId))).Single();
        Assert.Null(stored.ChapterId);
    }

    [Fact]
    public async Task GetRecuerdosAsync_ShouldMarkIsOwn_OnlyForCurrentUsersEntries()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photoId = Guid.NewGuid();
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "key", null, CustodioId, _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), CustodioId, "mine", _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), new PhotoId(photoId), new ChapterId(chapterId), new BaulId(baulId), "other-user", "not mine", _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetRecuerdosAsync(photoId);

        Assert.True(result.IsSuccess);
        var list = result.Value.ToList();
        Assert.True(list.Single(r => r.Text == "mine").IsOwn);
        Assert.False(list.Single(r => r.Text == "not mine").IsOwn);
    }
}
