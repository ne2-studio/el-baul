using ElBaul.Application;
using ElBaul.Infra.Lite;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;

namespace ElBaul.Tests;

public class PhotoSoftDeleteServiceTests
{
    private const string UserId = "custodio-1";

    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly StaticClock _clock = new();

    private PhotoSoftDeleteService CreateService() =>
        new(_photoRepository, _chapterRepository, _baulRepository, _clock);

    [Fact]
    public async Task SoftDeleteAsync_ShouldMarkPhotoDeleted_AndDecrementChapterPhotoCount()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "key", null, UserId, _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);
        var chapter = await _chapterRepository.GetByIdAsync(chapterId);
        await _chapterRepository.UpdateAsync(chapter! with { PhotoCount = 1 });

        await CreateService().SoftDeleteAsync(photo, "Foto duplicada");

        var deletedPhoto = await _photoRepository.GetByIdAsync(photo.Id);
        Assert.Equal(PhotoStatus.Deleted, deletedPhoto!.Status);
        Assert.Equal("Foto duplicada", deletedPhoto.DeletionReason);
        Assert.Equal(_clock.UtcNow(), deletedPhoto.DeletedAt);

        var updatedChapter = await _chapterRepository.GetByIdAsync(chapterId);
        Assert.Equal(0, updatedChapter!.PhotoCount);
    }

    [Fact]
    public async Task SoftDeleteAsync_ShouldNotRequireChapter_ForLoosePhoto()
    {
        var baulId = await SeedBaulAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), null, baulId, "key", null, UserId, _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);

        await CreateService().SoftDeleteAsync(photo, null);

        var deletedPhoto = await _photoRepository.GetByIdAsync(photo.Id);
        Assert.Equal(PhotoStatus.Deleted, deletedPhoto!.Status);
    }

    [Fact]
    public async Task SoftDeleteAsync_ShouldClearChapterCover_WhenDeletedPhotoWasTheCover()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "cover-key", null, UserId, _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);
        var chapter = await _chapterRepository.GetByIdAsync(chapterId);
        await _chapterRepository.UpdateAsync(chapter! with { PhotoCount = 1, CoverPhotoKey = "cover-key" });

        await CreateService().SoftDeleteAsync(photo, "reason");

        var updatedChapter = await _chapterRepository.GetByIdAsync(chapterId);
        Assert.Null(updatedChapter!.CoverPhotoKey);
    }

    [Fact]
    public async Task SoftDeleteAsync_ShouldKeepChapterCover_WhenDeletedPhotoWasNotTheCover()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "key", null, UserId, _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);
        var chapter = await _chapterRepository.GetByIdAsync(chapterId);
        await _chapterRepository.UpdateAsync(chapter! with { PhotoCount = 1, CoverPhotoKey = "cover-key" });

        await CreateService().SoftDeleteAsync(photo, "reason");

        var updatedChapter = await _chapterRepository.GetByIdAsync(chapterId);
        Assert.Equal("cover-key", updatedChapter!.CoverPhotoKey);
    }

    [Fact]
    public async Task SoftDeleteAsync_ShouldClearBaulCover_WhenDeletedPhotoWasTheCover()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "cover-key", null, UserId, _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);
        var baul = await _baulRepository.GetByIdAsync(baulId);
        await _baulRepository.UpdateAsync(baul! with { CoverPhotoKey = "cover-key" });

        await CreateService().SoftDeleteAsync(photo, "reason");

        var updatedBaul = await _baulRepository.GetByIdAsync(baulId);
        Assert.Null(updatedBaul!.CoverPhotoKey);
    }

    [Fact]
    public async Task SoftDeleteAsync_ShouldKeepBaulCover_WhenDeletedPhotoWasNotTheCover()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "key", null, UserId, _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);
        var baul = await _baulRepository.GetByIdAsync(baulId);
        await _baulRepository.UpdateAsync(baul! with { CoverPhotoKey = "cover-key" });

        await CreateService().SoftDeleteAsync(photo, "reason");

        var updatedBaul = await _baulRepository.GetByIdAsync(baulId);
        Assert.Equal("cover-key", updatedBaul!.CoverPhotoKey);
    }

    private async Task<(BaulId BaulId, ChapterId ChapterId)> SeedBaulWithChapterAsync()
    {
        var baulId = await SeedBaulAsync();
        var chapterId = new ChapterId(Guid.NewGuid());
        await _chapterRepository.CreateAsync(new Chapter(chapterId, baulId, "Chapter", 0, null, _clock.UtcNow(), _clock.UtcNow()));
        return (baulId, chapterId);
    }

    private async Task<BaulId> SeedBaulAsync()
    {
        var baulId = new BaulId(Guid.NewGuid());
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, UserId, 0, _clock.UtcNow(), _clock.UtcNow()));
        return baulId;
    }
}
