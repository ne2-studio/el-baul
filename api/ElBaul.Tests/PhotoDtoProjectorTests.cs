using ElBaul.Application.Photos;
using ElBaul.Infra.Lite;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Users;

using ElBaul.Tests.Fakes;

namespace ElBaul.Tests;

public class PhotoDtoProjectorTests
{
    private const string UserId = "custodio-1";

    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly FakePhotoStorage _photoStorage = new();
    private readonly StaticClock _clock = new();

    private PhotoDtoProjector CreateProjector() => new(_photoStorage, _recuerdoRepository);

    [Fact]
    public async Task ProjectAsync_ShouldBuildStorageUrls_ForGridAndFullPlacements()
    {
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), null, new BaulId(Guid.NewGuid()), "photo-key", null, UserId, _clock.UtcNow());

        var dto = await CreateProjector().ProjectAsync(photo);

        Assert.Equal("https://imgproxy.test/PhotoGridThumbnail/photo-key", dto.ThumbnailUrl);
        Assert.Equal("https://imgproxy.test/PhotoFull/photo-key", dto.FullUrl);
    }

    [Fact]
    public async Task ProjectAsync_ShouldIncludeRecuerdoCounts_PerPhoto()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var countedPhoto = Photo.Create(new PhotoId(Guid.NewGuid()), null, baulId, "counted-key", null, UserId, _clock.UtcNow());
        var emptyPhoto = Photo.Create(new PhotoId(Guid.NewGuid()), null, baulId, "empty-key", null, UserId, _clock.UtcNow());
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), countedPhoto.Id, null, baulId, UserId, "uno", _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), countedPhoto.Id, null, baulId, UserId, "dos", _clock.UtcNow()));
        await _recuerdoRepository.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, baulId, UserId, "suelto", _clock.UtcNow()));

        var dtos = await CreateProjector().ProjectAsync([countedPhoto, emptyPhoto]);

        Assert.Equal(2, dtos.Single(p => p.Id == countedPhoto.Id.ToString()).RecuerdoCount);
        Assert.Equal(0, dtos.Single(p => p.Id == emptyPhoto.Id.ToString()).RecuerdoCount);
    }
}
