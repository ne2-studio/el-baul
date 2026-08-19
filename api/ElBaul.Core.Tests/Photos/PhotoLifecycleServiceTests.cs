using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Chapters.Application;
using ElBaul.Core.Photos.Application;
using ElBaul.Infra.Lite;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;

using ElBaul.Tests.Fakes;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class PhotoLifecycleServiceTests
{
    private const string UserId = "custodio-1";

    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryBaulRepository _baulRepository = new(new InMemoryPersonaRepository());
    private readonly StaticClock _clock = new();

    private PhotoLifecycleService CreateService() =>
        new(_photoRepository,
            new ChapterPhotoCountListener(_chapterRepository),
            new BaulPhotoCoverListener(_baulRepository),
            _clock);

    [Fact]
    public async Task AddAsync_ShouldSetFirstPhotoAsChapterCover()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "key", null, new UserId(UserId), _clock.UtcNow());

        await CreateService().AddAsync(photo, chapterId, baulId, _clock.UtcNow());

        var updatedChapter = await _chapterRepository.GetByIdAsync(chapterId);
        Assert.Equal(photo.Id, updatedChapter!.CoverPhotoId);
        Assert.Equal(1, updatedChapter.PhotoCount);
    }

    [Fact]
    public async Task AddAsync_ShouldSetBaulCover_WhenBaulHasNoCoverYet()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "key", null, new UserId(UserId), _clock.UtcNow());

        await CreateService().AddAsync(photo, chapterId, baulId, _clock.UtcNow());

        var updatedBaul = await _baulRepository.GetByIdAsync(baulId);
        Assert.Equal(photo.Id, updatedBaul!.CoverPhotoId);
    }

    [Fact]
    public async Task AddAsync_ShouldNotOverwriteExistingBaulCover()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var existingCoverPhotoId = new PhotoId(Guid.NewGuid());
        var existingBaul = await _baulRepository.GetByIdAsync(baulId);
        await _baulRepository.UpdateAsync(existingBaul!.WithCoverPhotoId(existingCoverPhotoId, _clock.UtcNow()));
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "new-key", null, new UserId(UserId), _clock.UtcNow());

        await CreateService().AddAsync(photo, chapterId, baulId, _clock.UtcNow());

        var updatedBaul = await _baulRepository.GetByIdAsync(baulId);
        Assert.Equal(existingCoverPhotoId, updatedBaul!.CoverPhotoId);
    }

    [Fact]
    public async Task AddAsync_ShouldSetBaulCover_ForLoosePhoto_WhenChapterIsNull()
    {
        var baulId = await SeedBaulAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), null, baulId, "key", null, new UserId(UserId), _clock.UtcNow());

        await CreateService().AddAsync(photo, null, baulId, _clock.UtcNow());

        var updatedBaul = await _baulRepository.GetByIdAsync(baulId);
        Assert.Equal(photo.Id, updatedBaul!.CoverPhotoId);
    }

    [Fact]
    public async Task AddAsync_ShouldSkipChapterBookkeeping_WhenChapterIsNull()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), null, baulId, "key", null, new UserId(UserId), _clock.UtcNow());

        await CreateService().AddAsync(photo, null, baulId, _clock.UtcNow());

        var chapter = await _chapterRepository.GetByIdAsync(chapterId);
        Assert.Equal(0, chapter!.PhotoCount);
        Assert.Null(chapter.CoverPhotoId);
    }

    [Fact]
    public async Task MoveAsync_ShouldClearSourceCover_WhenMovedPhotoWasTheCover()
    {
        var (baulId, sourceChapterId, targetChapterId) = await SeedBaulWithTwoChaptersAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), sourceChapterId, baulId, "cover-key", null, new UserId(UserId), _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);
        var sourceChapter = await _chapterRepository.GetByIdAsync(sourceChapterId);
        await _chapterRepository.UpdateAsync(sourceChapter!.WithPhotoAdded(PhotoRef.From(photo), _clock.UtcNow()));

        await CreateService().MoveAsync(photo, sourceChapterId, targetChapterId);

        var updatedSource = await _chapterRepository.GetByIdAsync(sourceChapterId);
        Assert.Null(updatedSource!.CoverPhotoId);
    }

    [Fact]
    public async Task MoveAsync_ShouldSetTargetCover_WhenTargetHasNoCoverYet()
    {
        var (baulId, sourceChapterId, targetChapterId) = await SeedBaulWithTwoChaptersAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), sourceChapterId, baulId, "key", null, new UserId(UserId), _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);

        await CreateService().MoveAsync(photo, sourceChapterId, targetChapterId);

        var updatedTarget = await _chapterRepository.GetByIdAsync(targetChapterId);
        Assert.Equal(photo.Id, updatedTarget!.CoverPhotoId);
    }

    [Fact]
    public async Task MoveAsync_ShouldAddToTargetOnly_WhenPhotoHadNoSourceChapter()
    {
        var (baulId, _, targetChapterId) = await SeedBaulWithTwoChaptersAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), null, baulId, "key", null, new UserId(UserId), _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);

        var updatedPhoto = await CreateService().MoveAsync(photo, null, targetChapterId);

        Assert.Equal(targetChapterId, updatedPhoto.ChapterId);
        var updatedTarget = await _chapterRepository.GetByIdAsync(targetChapterId);
        Assert.Equal(1, updatedTarget!.PhotoCount);
        Assert.Equal(photo.Id, updatedTarget.CoverPhotoId);
    }

    [Fact]
    public async Task SoftDeleteAsync_ShouldMarkPhotoDeleted_AndDecrementChapterPhotoCount()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "key", null, new UserId(UserId), _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);
        var chapter = await _chapterRepository.GetByIdAsync(chapterId);
        await _chapterRepository.UpdateAsync(chapter!.WithPhotoAdded(PhotoRef.From(photo), _clock.UtcNow()));

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
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), null, baulId, "key", null, new UserId(UserId), _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);

        await CreateService().SoftDeleteAsync(photo, null);

        var deletedPhoto = await _photoRepository.GetByIdAsync(photo.Id);
        Assert.Equal(PhotoStatus.Deleted, deletedPhoto!.Status);
    }

    [Fact]
    public async Task SoftDeleteAsync_ShouldClearChapterCover_WhenDeletedPhotoWasTheCover()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "cover-key", null, new UserId(UserId), _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);
        var chapter = await _chapterRepository.GetByIdAsync(chapterId);
        await _chapterRepository.UpdateAsync(chapter!.WithPhotoAdded(PhotoRef.From(photo), _clock.UtcNow()));

        await CreateService().SoftDeleteAsync(photo, "reason");

        var updatedChapter = await _chapterRepository.GetByIdAsync(chapterId);
        Assert.Null(updatedChapter!.CoverPhotoId);
    }

    [Fact]
    public async Task SoftDeleteAsync_ShouldKeepChapterCover_WhenDeletedPhotoWasNotTheCover()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "key", null, new UserId(UserId), _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);
        var otherCoverPhotoId = new PhotoId(Guid.NewGuid());
        var chapter = await _chapterRepository.GetByIdAsync(chapterId);
        await _chapterRepository.UpdateAsync(chapter!.WithPhotoAdded(PhotoRef.From(photo), _clock.UtcNow()).WithCoverPhotoId(otherCoverPhotoId, _clock.UtcNow()));

        await CreateService().SoftDeleteAsync(photo, "reason");

        var updatedChapter = await _chapterRepository.GetByIdAsync(chapterId);
        Assert.Equal(otherCoverPhotoId, updatedChapter!.CoverPhotoId);
    }

    [Fact]
    public async Task SoftDeleteAsync_ShouldClearBaulCover_WhenDeletedPhotoWasTheCover()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "cover-key", null, new UserId(UserId), _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);
        var baul = await _baulRepository.GetByIdAsync(baulId);
        await _baulRepository.UpdateAsync(baul!.WithCoverPhotoId(photo.Id, _clock.UtcNow()));

        await CreateService().SoftDeleteAsync(photo, "reason");

        var updatedBaul = await _baulRepository.GetByIdAsync(baulId);
        Assert.Null(updatedBaul!.CoverPhotoId);
    }

    [Fact]
    public async Task SoftDeleteAsync_ShouldKeepBaulCover_WhenDeletedPhotoWasNotTheCover()
    {
        var (baulId, chapterId) = await SeedBaulWithChapterAsync();
        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), chapterId, baulId, "key", null, new UserId(UserId), _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);
        var otherCoverPhotoId = new PhotoId(Guid.NewGuid());
        var baul = await _baulRepository.GetByIdAsync(baulId);
        await _baulRepository.UpdateAsync(baul!.WithCoverPhotoId(otherCoverPhotoId, _clock.UtcNow()));

        await CreateService().SoftDeleteAsync(photo, "reason");

        var updatedBaul = await _baulRepository.GetByIdAsync(baulId);
        Assert.Equal(otherCoverPhotoId, updatedBaul!.CoverPhotoId);
    }

    private async Task<(BaulId BaulId, ChapterId ChapterId)> SeedBaulWithChapterAsync()
    {
        var baulId = await SeedBaulAsync();
        var chapterId = new ChapterId(Guid.NewGuid());
        await _chapterRepository.CreateAsync(new Chapter(chapterId, baulId, "Chapter", 0, _clock.UtcNow(), _clock.UtcNow()));
        return (baulId, chapterId);
    }

    private async Task<(BaulId BaulId, ChapterId SourceChapterId, ChapterId TargetChapterId)> SeedBaulWithTwoChaptersAsync()
    {
        var (baulId, sourceChapterId) = await SeedBaulWithChapterAsync();
        var targetChapterId = new ChapterId(Guid.NewGuid());
        await _chapterRepository.CreateAsync(new Chapter(targetChapterId, baulId, "Destino", 0, _clock.UtcNow(), _clock.UtcNow()));
        return (baulId, sourceChapterId, targetChapterId);
    }

    private async Task<BaulId> SeedBaulAsync()
    {
        var baulId = new BaulId(Guid.NewGuid());
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, new UserId(UserId), 0, _clock.UtcNow(), _clock.UtcNow()));
        return baulId;
    }
}
