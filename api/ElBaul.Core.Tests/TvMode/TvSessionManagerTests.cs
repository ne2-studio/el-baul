using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Personas.Application;
using ElBaul.Core.TvMode.Application;
using ElBaul.Infra.Lite;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using Ne2Studio.Common;

using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class TvSessionManagerTests
{
    private static readonly DateTime Now = new(2026, 8, 13, 12, 0, 0, DateTimeKind.Utc);

    private readonly InMemoryTvSessionRepository _tvSessions = new();
    private readonly InMemoryPhotoRepository _photos = new();
    private readonly InMemoryChapterRepository _chapters = new();
    private readonly InMemoryPhotoPersonaTagRepository _photoPersonaTags = new();
    private readonly InMemoryRecuerdoRepository _recuerdos = new();
    private readonly InMemoryPersonaRepository _personas = new();
    private readonly InMemoryBaulRepository _baules;
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new(Now);
    private readonly StaticCurrentUserProvider _currentUser = new("user-1");
    private readonly StaticAppConfiguration _configuration = new(
        publicUrl: "https://app.el-baul.test",
        apiPublicUrl: "https://api.el-baul.test",
        tvModeEnabled: true);

    public TvSessionManagerTests()
    {
        _baules = new InMemoryBaulRepository(_personas);
    }

    [Fact]
    public async Task CreateAsync_ShouldCreatePublicUrl_WhenUserBelongsToBaul()
    {
        var baul = await SeedBaulAsync();
        var manager = CreateManager();

        var result = await manager.CreateAsync(baul.Id);

        Assert.True(result.IsSuccess);
        Assert.StartsWith("https://app.el-baul.test/tv/", result.Value.Url);
        Assert.False(string.IsNullOrWhiteSpace(result.Value.Token));
        Assert.Equal(Now.AddHours(4), result.Value.ExpiresAt);
        Assert.NotNull(await _tvSessions.GetByTokenAsync(result.Value.Token));
    }

    [Fact]
    public async Task CreateAsync_ShouldFail_WhenTvModeDisabled()
    {
        var baul = await SeedBaulAsync();
        var manager = CreateManager(tvModeEnabled: false);

        var result = await manager.CreateAsync(baul.Id);

        Assert.True(result.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, result.Error.Code);
    }

    [Fact]
    public async Task GetContentAsync_ShouldExposeBaulNameAndPhotoContext()
    {
        var baul = await SeedBaulAsync();
        var chapter = new Chapter(new ChapterId(Guid.NewGuid()), baul.Id, "Verano en la playa", 1, Now, Now);
        await _chapters.CreateAsync(chapter);
        var persona = new Persona(new PersonaId(Guid.NewGuid()), baul.Id, null, "Rosa", BaulRole.Colaborador, Now);
        await _personas.AddPersonaAsync(persona);

        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapter.Id, baul.Id, "photo-key", PhotoDate.Parse(2026, 7, 15).Value, new UserId("user-1"), Now);
        await _photos.CreateAsync(photo);
        await _photoPersonaTags.SetTagsAsync(photo.Id, baul.Id, [persona.Id], Now);
        await _recuerdos.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), photo.Id, chapter.Id, baul.Id, new UserId("user-1"), "Aprendiste a nadar", Now));

        var manager = CreateManager();
        var created = await manager.CreateAsync(baul.Id);

        var content = await manager.GetContentAsync(created.Value.Token);

        Assert.True(content.IsSuccess);
        Assert.Equal("Familia Pérez", content.Value.BaulName);
        var photoDto = Assert.Single(content.Value.Photos);
        Assert.Equal("https://imgproxy.test/PhotoFull/photo-key", photoDto.ImageUrl);
        Assert.Equal("Verano en la playa", photoDto.ChapterName);
        Assert.Equal(["Rosa"], photoDto.PersonaNames);
        Assert.Equal("Aprendiste a nadar", photoDto.Quote);
        Assert.Equal("Pedro", photoDto.QuoteAuthor);
    }

    [Fact]
    public async Task GetContentAsync_ShouldReturnNotFound_AfterCancellation()
    {
        var baul = await SeedBaulAsync();
        var manager = CreateManager();
        var created = await manager.CreateAsync(baul.Id);

        var cancelled = await manager.CancelAsync(created.Value.Token);
        var content = await manager.GetContentAsync(created.Value.Token);

        Assert.True(cancelled.IsSuccess);
        Assert.True(content.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, content.Error.Code);
    }

    [Fact]
    public async Task GetContentAsync_ShouldReturnNotFound_OnceExpired()
    {
        var baul = await SeedBaulAsync();
        var manager = CreateManager();
        var created = await manager.CreateAsync(baul.Id);

        _clock.Now = Now.AddHours(4).AddMinutes(1);
        var content = await manager.GetContentAsync(created.Value.Token);

        Assert.True(content.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, content.Error.Code);
    }

    private TvSessionManager CreateManager(bool tvModeEnabled = true) => new(
        NullLogger<TvSessionManager>.Instance,
        _tvSessions,
        _baules,
        _personas,
        _photos,
        _chapters,
        _photoPersonaTags,
        _recuerdos,
        _photoStorage,
        new StaticIdGenerator(Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")),
        _clock,
        _currentUser,
        tvModeEnabled ? _configuration : new StaticAppConfiguration(
            publicUrl: "https://app.el-baul.test", apiPublicUrl: "https://api.el-baul.test", tvModeEnabled: false),
        new BaulAccessService(_baules, _personas, NullLogger<BaulAccessService>.Instance),
        new AuthorInfoProjector(_personas, _photos, _photoStorage));

    private async Task<Baul> SeedBaulAsync()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var baul = new Baul(baulId, "Familia Pérez", null, new UserId("user-1"), 1, Now, Now);
        await _baules.CreateAsync(baul);
        await _personas.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId("user-1"), "Pedro", BaulRole.Administrador, Now));
        return baul;
    }
}
