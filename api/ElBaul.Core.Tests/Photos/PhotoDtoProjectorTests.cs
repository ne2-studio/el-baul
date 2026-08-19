using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Recuerdos.Domain;
using ElBaul.Core.Photos.Application;
using ElBaul.Infra.Lite;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;

using ElBaul.Tests.Fakes;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class PhotoDtoProjectorTests
{
    private const string UserId = "custodio-1";
    private const string OtherUserId = "colaborador-1";

    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();

    private PhotoDtoProjector CreateProjector() => new(_photoStorage, _recuerdoRepository, _clock);

    [Fact]
    public async Task ProjectAsync_ShouldBuildStorageUrls_ForGridAndFullPlacements()
    {
        var photo = PhotoMother.Create(new PhotoId(Guid.NewGuid()), null, new BaulId(Guid.NewGuid()), "photo-key", null, new UserId(UserId), _clock.UtcNow());

        var dto = await CreateProjector().ProjectAsync(photo, isAdmin: true, new UserId(UserId));

        Assert.Equal("https://imgproxy.test/PhotoGridThumbnail/photo-key", dto.ThumbnailUrl);
        Assert.Equal("https://imgproxy.test/PhotoFull/photo-key", dto.FullUrl);
    }

    [Fact]
    public async Task ProjectAsync_ShouldIncludeRecuerdoCounts_PerPhoto()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var countedPhoto = PhotoMother.Create(new PhotoId(Guid.NewGuid()), null, baulId, "counted-key", null, new UserId(UserId), _clock.UtcNow());
        var emptyPhoto = PhotoMother.Create(new PhotoId(Guid.NewGuid()), null, baulId, "empty-key", null, new UserId(UserId), _clock.UtcNow());
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), countedPhoto.Id, null, baulId, new UserId(UserId), "uno", _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), countedPhoto.Id, null, baulId, new UserId(UserId), "dos", _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, baulId, new UserId(UserId), "suelto", _clock.UtcNow()));

        var dtos = await CreateProjector().ProjectAsync([countedPhoto, emptyPhoto], isAdmin: true, new UserId(UserId));

        Assert.Equal(2, dtos.Single(p => p.Id == countedPhoto.Id.ToString()).RecuerdoCount);
        Assert.Equal(0, dtos.Single(p => p.Id == emptyPhoto.Id.ToString()).RecuerdoCount);
    }

    [Fact]
    public async Task ProjectAsync_ShouldGrantDelete_NotRemovalRequest_ForAdmin()
    {
        // Admin uploaded by someone else, ages ago — still deletable directly, never a removal
        // request, no matter who uploaded it or how long ago.
        var photo = PhotoMother.Create(
            new PhotoId(Guid.NewGuid()), null, new BaulId(Guid.NewGuid()), "photo-key", null,
            new UserId(OtherUserId), _clock.UtcNow().AddDays(-30));

        var dto = await CreateProjector().ProjectAsync(photo, isAdmin: true, new UserId(UserId));

        Assert.True(dto.CanDelete);
        Assert.False(dto.CanRequestRemoval);
    }

    [Fact]
    public async Task ProjectAsync_ShouldGrantDelete_NotRemovalRequest_ForOwnRecentUpload()
    {
        var photo = PhotoMother.Create(
            new PhotoId(Guid.NewGuid()), null, new BaulId(Guid.NewGuid()), "photo-key", null,
            new UserId(UserId), _clock.UtcNow());

        var dto = await CreateProjector().ProjectAsync(photo, isAdmin: false, new UserId(UserId));

        Assert.True(dto.CanDelete);
        Assert.False(dto.CanRequestRemoval);
    }

    [Fact]
    public async Task ProjectAsync_ShouldGrantRemovalRequest_NotDelete_ForOwnUploadPastGracePeriod()
    {
        var photo = PhotoMother.Create(
            new PhotoId(Guid.NewGuid()), null, new BaulId(Guid.NewGuid()), "photo-key", null,
            new UserId(UserId), _clock.UtcNow() - PhotoDeletePolicy.OwnPhotoGracePeriod);

        var dto = await CreateProjector().ProjectAsync(photo, isAdmin: false, new UserId(UserId));

        Assert.False(dto.CanDelete);
        Assert.True(dto.CanRequestRemoval);
    }

    [Fact]
    public async Task ProjectAsync_ShouldGrantRemovalRequest_NotDelete_ForSomeoneElsesRecentUpload()
    {
        var photo = PhotoMother.Create(
            new PhotoId(Guid.NewGuid()), null, new BaulId(Guid.NewGuid()), "photo-key", null,
            new UserId(OtherUserId), _clock.UtcNow());

        var dto = await CreateProjector().ProjectAsync(photo, isAdmin: false, new UserId(UserId));

        Assert.False(dto.CanDelete);
        Assert.True(dto.CanRequestRemoval);
    }
}
