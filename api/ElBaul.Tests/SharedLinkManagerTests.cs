using ElBaul.Application.Bauls;
using ElBaul.Application.Personas;
using ElBaul.Application.Sharing;
using ElBaul.Infra.Lite;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;
using Ne2Studio.Common;

using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class SharedLinkManagerTests
{
    private static readonly DateTime Now = new(2026, 7, 28, 12, 0, 0, DateTimeKind.Utc);

    private readonly InMemorySharedLinkRepository _sharedLinks = new();
    private readonly InMemoryPhotoRepository _photos = new();
    private readonly InMemoryRecuerdoRepository _recuerdos = new();
    private readonly InMemoryBaulRepository _baules = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();
    private readonly StaticCurrentUserProvider _currentUser = new("user-1");
    private readonly StaticAppConfiguration _configuration = new(
        publicUrl: "https://app.el-baul.test",
        apiPublicUrl: "https://api.el-baul.test",
        sharedLinksEnabled: true);

    [Fact]
    public async Task CreateForPhotoAsync_ShouldCreatePublicUrl_WhenUserBelongsToBaul()
    {
        var photo = await SeedPhotoAsync();
        var manager = CreateManager();

        var result = await manager.CreateForPhotoAsync(photo.Id);

        Assert.True(result.IsSuccess);
        Assert.StartsWith("https://api.el-baul.test/s/", result.Value.Url);
        Assert.False(string.IsNullOrWhiteSpace(result.Value.Token));
        Assert.NotNull(await _sharedLinks.GetByTokenAsync(result.Value.Token));
    }

    [Fact]
    public async Task GetLandingAsync_ShouldExposeOnlySharedPhotoAndRecuerdo()
    {
        var photo = await SeedPhotoAsync();
        var recuerdo = new Recuerdo(new RecuerdoId(Guid.NewGuid()), photo.Id, photo.ChapterId, photo.BaulId, new UserId("user-1"), "Un recuerdo familiar", Now);
        await _recuerdos.CreateAsync(recuerdo);
        var manager = CreateManager();
        var created = await manager.CreateForRecuerdoAsync(recuerdo.Id);

        var landing = await manager.GetLandingAsync(created.Value.Token);

        Assert.True(landing.IsSuccess);
        Assert.Equal("Un recuerdo de Familia Pérez", landing.Value.Title);
        Assert.Equal("Un recuerdo familiar", landing.Value.RecuerdoText);
        Assert.Equal("Pedro", landing.Value.AuthorName);
        Assert.Equal("https://imgproxy.test/PhotoFull/photo-key", landing.Value.ImageUrl);
        Assert.Equal($"https://app.el-baul.test/baules/{photo.BaulId}/capitulos/{photo.ChapterId}/foto/{photo.Id}", landing.Value.AppUrl);
    }

    [Fact]
    public async Task GetLandingAsync_ShouldReturnNotFound_AfterRevocation()
    {
        var photo = await SeedPhotoAsync();
        var manager = CreateManager();
        var created = await manager.CreateForPhotoAsync(photo.Id);

        var revoked = await manager.RevokeAsync(created.Value.Token);
        var landing = await manager.GetLandingAsync(created.Value.Token);

        Assert.True(revoked.IsSuccess);
        Assert.True(landing.IsFailure);
        Assert.Equal(ApplicationErrorCode.NotFound, landing.Error.Code);
    }

    private SharedLinkManager CreateManager() => new(
        NullLogger<SharedLinkManager>.Instance,
        _sharedLinks,
        _photos,
        _recuerdos,
        _baules,
        _photoStorage,
        new StaticIdGenerator(Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")),
        _clock,
        _currentUser,
        _configuration,
        new BaulAccessService(_baules, NullLogger<BaulAccessService>.Instance),
        new AuthorInfoProjector(_baules, _photos, _photoStorage));

    private async Task<Photo> SeedPhotoAsync()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var chapterId = new ChapterId(Guid.NewGuid());
        await _baules.CreateAsync(new Baul(baulId, "Familia Pérez", null, new UserId("user-1"), 1, Now, Now));
        await _baules.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId("user-1"), "Pedro", BaulRole.Administrador, Now));
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "photo-key", null, new UserId("user-1"), Now);
        await _photos.CreateAsync(photo);
        return photo;
    }
}
