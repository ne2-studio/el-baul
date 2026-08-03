using ElBaul.Application;
using ElBaul.Infra.Lite;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;

namespace ElBaul.Tests;

public class PhotoLifecycleServiceTests
{
    private const string UserId = "custodio-1";

    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly StaticClock _clock = new();

    private PhotoLifecycleService CreateService() =>
        new(_photoRepository, _chapterRepository, _baulRepository, _clock);

    [Fact]
    public async Task AddAsync_ShouldSetFirstPhotoAsChapterCover()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var chapter = await _chapterRepository.GetByIdAsync(chapterId);
        var baul = await _baulRepository.GetByIdAsync(baulId);
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "key", null, UserId, _clock.UtcNow());

        await CreateService().AddAsync(photo, chapter, baul!, _clock.UtcNow());

        var updatedChapter = await _chapterRepository.GetByIdAsync(chapterId);
        Assert.Equal("key", updatedChapter!.CoverPhotoKey);
        Assert.Equal(1, updatedChapter.PhotoCount);
    }

    [Fact]
    public async Task AddAsync_ShouldSetBaulCover_WhenBaulHasNoCoverYet()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var chapter = await _chapterRepository.GetByIdAsync(chapterId);
        var baul = await _baulRepository.GetByIdAsync(baulId);
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "key", null, UserId, _clock.UtcNow());

        await CreateService().AddAsync(photo, chapter, baul!, _clock.UtcNow());

        var updatedBaul = await _baulRepository.GetByIdAsync(baulId);
        Assert.Equal("key", updatedBaul!.CoverPhotoKey);
    }

    [Fact]
    public async Task AddAsync_ShouldNotOverwriteExistingBaulCover()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var chapter = await _chapterRepository.GetByIdAsync(chapterId);
        var existingBaul = await _baulRepository.GetByIdAsync(baulId);
        await _baulRepository.UpdateAsync(existingBaul! with { CoverPhotoKey = "existing-key" });
        var baul = await _baulRepository.GetByIdAsync(baulId);
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "new-key", null, UserId, _clock.UtcNow());

        await CreateService().AddAsync(photo, chapter, baul!, _clock.UtcNow());

        var updatedBaul = await _baulRepository.GetByIdAsync(baulId);
        Assert.Equal("existing-key", updatedBaul!.CoverPhotoKey);
    }

    [Fact]
    public async Task AddAsync_ShouldSetBaulCover_ForLoosePhoto_WhenChapterIsNull()
    {
        var baulId = await SeedBaulAsync();
        var baul = await _baulRepository.GetByIdAsync(baulId);
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), null, baulId, "key", null, UserId, _clock.UtcNow());

        await CreateService().AddAsync(photo, null, baul!, _clock.UtcNow());

        var updatedBaul = await _baulRepository.GetByIdAsync(baulId);
        Assert.Equal("key", updatedBaul!.CoverPhotoKey);
    }

    [Fact]
    public async Task AddAsync_ShouldSkipChapterBookkeeping_WhenChapterIsNull()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var baul = await _baulRepository.GetByIdAsync(baulId);
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), null, baulId, "key", null, UserId, _clock.UtcNow());

        await CreateService().AddAsync(photo, null, baul!, _clock.UtcNow());

        var chapter = await _chapterRepository.GetByIdAsync(chapterId);
        Assert.Equal(0, chapter!.PhotoCount);
        Assert.Null(chapter.CoverPhotoKey);
    }

    [Fact]
    public async Task MoveAsync_ShouldClearSourceCover_WhenMovedPhotoWasTheCover()
    {
        var (baulId, sourceChapterId, targetChapterId) = await SeedBaulWithTwoChaptersAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), sourceChapterId, baulId, "cover-key", null, UserId, _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);
        var sourceChapter = await _chapterRepository.GetByIdAsync(sourceChapterId);
        await _chapterRepository.UpdateAsync(sourceChapter! with { PhotoCount = 1, CoverPhotoKey = "cover-key" });
        var targetChapter = await _chapterRepository.GetByIdAsync(targetChapterId);

        await CreateService().MoveAsync(photo, await _chapterRepository.GetByIdAsync(sourceChapterId), targetChapter!);

        var updatedSource = await _chapterRepository.GetByIdAsync(sourceChapterId);
        Assert.Null(updatedSource!.CoverPhotoKey);
    }

    [Fact]
    public async Task MoveAsync_ShouldSetTargetCover_WhenTargetHasNoCoverYet()
    {
        var (baulId, sourceChapterId, targetChapterId) = await SeedBaulWithTwoChaptersAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), sourceChapterId, baulId, "key", null, UserId, _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);
        var sourceChapter = await _chapterRepository.GetByIdAsync(sourceChapterId);
        var targetChapter = await _chapterRepository.GetByIdAsync(targetChapterId);

        await CreateService().MoveAsync(photo, sourceChapter, targetChapter!);

        var updatedTarget = await _chapterRepository.GetByIdAsync(targetChapterId);
        Assert.Equal("key", updatedTarget!.CoverPhotoKey);
    }

    [Fact]
    public async Task MoveAsync_ShouldAddToTargetOnly_WhenPhotoHadNoSourceChapter()
    {
        var (baulId, _, targetChapterId) = await SeedBaulWithTwoChaptersAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), null, baulId, "key", null, UserId, _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);
        var targetChapter = await _chapterRepository.GetByIdAsync(targetChapterId);

        var updatedPhoto = await CreateService().MoveAsync(photo, null, targetChapter!);

        Assert.Equal(targetChapterId, updatedPhoto.ChapterId);
        var updatedTarget = await _chapterRepository.GetByIdAsync(targetChapterId);
        Assert.Equal(1, updatedTarget!.PhotoCount);
        Assert.Equal("key", updatedTarget.CoverPhotoKey);
    }

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

    private async Task<(BaulId BaulId, ChapterId SourceChapterId, ChapterId TargetChapterId)> SeedBaulWithTwoChaptersAsync()
    {
        var (baulId, sourceChapterId) = await SeedBaulWithChapterAsync();
        var targetChapterId = new ChapterId(Guid.NewGuid());
        await _chapterRepository.CreateAsync(new Chapter(targetChapterId, baulId, "Destino", 0, null, _clock.UtcNow(), _clock.UtcNow()));
        return (baulId, sourceChapterId, targetChapterId);
    }

    private async Task<BaulId> SeedBaulAsync()
    {
        var baulId = new BaulId(Guid.NewGuid());
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, UserId, 0, _clock.UtcNow(), _clock.UtcNow()));
        return baulId;
    }
}
