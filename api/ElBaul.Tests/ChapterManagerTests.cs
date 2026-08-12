using ElBaul.Application.Bauls;
using ElBaul.Application.Chapters;
using ElBaul.Application.Personas;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using ElBaul.Tests.Fixtures;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class ChapterManagerTests
{
    private const string CustodioId = BaulFixture.DefaultCustodioId;
    private const string StrangerId = "stranger";

    private readonly BaulFixture _fixture = new();
    private readonly FakePhotoStorage _photoStorage = new();

    private ChapterManager CreateManager(string currentUserId, Guid? nextId = null) =>
        new(NullLogger<ChapterManager>.Instance, _fixture.Chapters,
            new InMemoryChapterListReadModel(_fixture.Chapters, _fixture.Photos, _fixture.Recuerdos),
            _fixture.Baules, _fixture.Photos,
            _fixture.Recuerdos, _photoStorage,
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), _fixture.Clock, new StaticCurrentUserProvider(currentUserId),
            new BaulAccessService(_fixture.Baules, NullLogger<BaulAccessService>.Instance),
            new AuthorInfoProjector(_fixture.Baules, _fixture.Photos, _photoStorage), new FakeUnitOfWork());

    [Fact]
    public async Task CreateAsync_ShouldIncrementBaulChapterCount()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateAsync(baulId, "Vacaciones");

        Assert.True(result.IsSuccess);
        var baul = await _fixture.Baules.GetByIdAsync(baulId);
        Assert.Equal(1, baul!.ChapterCount);
    }

    [Fact]
    public async Task CreateAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");

        var manager = CreateManager(StrangerId);
        var result = await manager.CreateAsync(baulId, "Vacaciones");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }

    [Fact]
    public async Task CreateAsync_ShouldAllow_ForColaboradorRole()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        const string colaboradorId = "colaborador-1";
        await _fixture.AddColaboradorAsync(baulId, colaboradorId);

        var manager = CreateManager(colaboradorId);
        var result = await manager.CreateAsync(baulId, "Vacaciones");

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task CreateAsync_ShouldRecordTheCreatingUser()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");

        var manager = CreateManager(CustodioId);
        var result = await manager.CreateAsync(baulId, "Vacaciones");

        Assert.True(result.IsSuccess);
        var chapter = await _fixture.Chapters.GetByIdAsync(new ChapterId(Guid.Parse(result.Value.Id)));
        Assert.Equal(CustodioId, chapter!.CreatedByUserId);
    }

    [Fact]
    public async Task GetByBaulIdAsync_ShouldResolveSignedUrls_ForCoverPhotos()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        await _fixture.AddChapterAsync(baulId, "Chapter", coverPhotoKey: "cover-key", photoCount: 1);

        var manager = CreateManager(CustodioId);
        var result = await manager.GetByBaulIdAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Contains("cover-key", result.Value.Single().CoverPhotoUrl);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldSetCoverPhotoKey_ForCustodio()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var chapterId = await _fixture.AddChapterAsync(baulId, "Chapter", photoCount: 1);
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId, "photo-key");

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(chapterId, photoId, new PhotoCrop(0.25m, 0.75m, 1.8m));

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value.CoverPhotoUrl);
        Assert.Equal(0.25m, result.Value.CoverCropX);
        Assert.Equal(0.75m, result.Value.CoverCropY);
        Assert.Equal(1.8m, result.Value.CoverCropScale);

        var chapter = await _fixture.Chapters.GetByIdAsync(chapterId);
        Assert.Equal("photo-key", chapter!.CoverPhotoKey);
        Assert.Equal(0.25m, chapter.CoverCropX);
        Assert.Equal(0.75m, chapter.CoverCropY);
        Assert.Equal(1.8m, chapter.CoverCropScale);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldAllow_ForColaboradorRole()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        const string colaboradorId = "colaborador-1";
        await _fixture.AddColaboradorAsync(baulId, colaboradorId);
        var chapterId = await _fixture.AddChapterAsync(baulId, "Chapter", photoCount: 1);
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId, "photo-key", uploadedBy: colaboradorId);

        var manager = CreateManager(colaboradorId);
        var result = await manager.SetCoverAsync(chapterId, photoId, new PhotoCrop(0.5m, 0.5m, 1m));

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldFail_WhenPhotoDoesNotExist()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var chapterId = await _fixture.AddChapterAsync(baulId, "Chapter");

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(chapterId, new PhotoId(Guid.NewGuid()), new PhotoCrop(0.5m, 0.5m, 1m));

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error.Message);
    }

    [Fact]
    public async Task SetCoverAsync_ShouldFail_WhenPhotoBelongsToDifferentChapter()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var chapterId = await _fixture.AddChapterAsync(baulId, "Chapter");
        var otherChapterId = await _fixture.AddChapterAsync(baulId, "Otro chapter", photoCount: 1);
        var photoId = await _fixture.AddPhotoAsync(baulId, otherChapterId, "photo-key");

        var manager = CreateManager(CustodioId);
        var result = await manager.SetCoverAsync(chapterId, photoId, new PhotoCrop(0.5m, 0.5m, 1m));

        Assert.True(result.IsFailure);
        Assert.Equal("Photo not found", result.Error.Message);
    }

    [Fact]
    public async Task UpdateAsync_ShouldUpdateName_ForCustodio()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var chapterId = await _fixture.AddChapterAsync(baulId, "Chapter");

        var manager = CreateManager(CustodioId);
        var result = await manager.UpdateAsync(chapterId, "Vacaciones 2024");

        Assert.True(result.IsSuccess);
        Assert.Equal("Vacaciones 2024", result.Value.Name);

        var chapter = await _fixture.Chapters.GetByIdAsync(chapterId);
        Assert.Equal("Vacaciones 2024", chapter!.Name);
    }

    [Fact]
    public async Task UpdateAsync_ShouldAllow_ForColaboradorRole()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        const string colaboradorId = "colaborador-1";
        await _fixture.AddColaboradorAsync(baulId, colaboradorId);
        var chapterId = await _fixture.AddChapterAsync(baulId, "Chapter");

        var manager = CreateManager(colaboradorId);
        var result = await manager.UpdateAsync(chapterId, "Vacaciones 2024");

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task UpdateAsync_ShouldFail_WhenChapterDoesNotExist()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.UpdateAsync(new ChapterId(Guid.NewGuid()), "Vacaciones 2024");

        Assert.True(result.IsFailure);
        Assert.Equal("Chapter not found", result.Error.Message);
    }

    [Fact]
    public async Task GetByBaulIdAsync_ShouldCountRecuerdos_RegardlessOfPhotoAssociation()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var chapterId = await _fixture.AddChapterAsync(baulId, "Chapter", photoCount: 1);
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId, "k1");

        // Photo-attached recuerdo, plus a chapter-level one with no photo at all — both
        // must count (this used to only count recuerdos joined through the chapter's
        // currently-active photos, silently dropping photo-less ones).
        await _fixture.Recuerdos.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), photoId, chapterId, baulId, new UserId(CustodioId), "con foto", _fixture.Clock.UtcNow()));
        await _fixture.Recuerdos.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, chapterId, baulId, new UserId(CustodioId), "sin foto", _fixture.Clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetByBaulIdAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Single().RecuerdoCount);
    }

    [Fact]
    public async Task GetByBaulIdAsync_ShouldScopeRecuerdoCountsAndLatestAuthor_PerChapter()
    {
        // Targets IChapterListReadModel's grouping specifically: with two chapters each with
        // their own recuerdos/authors, a chapter must never see another chapter's counts,
        // latest text, or latest author — the exact mistake a broken GroupBy/dictionary lookup
        // in the batched read model would produce.
        var baulId = await _fixture.CreateBaulAsync("Familia");
        const string secondUserId = "colaborador-2";
        await _fixture.AddColaboradorAsync(baulId, new UserId(secondUserId), "Colaboradora");

        var firstChapterId = await _fixture.AddChapterAsync(baulId, "Primero");
        var secondChapterId = await _fixture.AddChapterAsync(baulId, "Segundo");

        await _fixture.Recuerdos.CreateAsync(new Recuerdo(
            new RecuerdoId(Guid.NewGuid()), null, firstChapterId, baulId, new UserId(CustodioId), "Del primero", _fixture.Clock.UtcNow()));
        await _fixture.Recuerdos.CreateAsync(new Recuerdo(
            new RecuerdoId(Guid.NewGuid()), null, secondChapterId, baulId, new UserId(secondUserId), "Del segundo", _fixture.Clock.UtcNow()));
        await _fixture.Recuerdos.CreateAsync(new Recuerdo(
            new RecuerdoId(Guid.NewGuid()), null, secondChapterId, baulId, new UserId(secondUserId), "Del segundo, más reciente", _fixture.Clock.UtcNow().AddMinutes(1)));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetByBaulIdAsync(baulId);

        Assert.True(result.IsSuccess);
        var first = result.Value.Single(c => c.Id == firstChapterId.ToString());
        var second = result.Value.Single(c => c.Id == secondChapterId.ToString());

        Assert.Equal(1, first.RecuerdoCount);
        Assert.Equal("Del primero", first.LatestRecuerdoText);
        Assert.Equal("Custodio", first.LatestRecuerdoAuthor);

        Assert.Equal(2, second.RecuerdoCount);
        Assert.Equal("Del segundo, más reciente", second.LatestRecuerdoText);
        Assert.Equal("Colaboradora", second.LatestRecuerdoAuthor);
    }

    [Fact]
    public async Task GetByBaulIdAsync_ShouldComputeDateRangeAndUndatedCount()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var chapterId = await _fixture.AddChapterAsync(baulId, "Chapter", photoCount: 3);
        await _fixture.AddPhotoAsync(baulId, chapterId, "k1", PhotoDates.Of(2020, 5, 10));
        await _fixture.AddPhotoAsync(baulId, chapterId, "k2", PhotoDates.Of(2018, null, null));
        await _fixture.AddPhotoAsync(baulId, chapterId, "k3");

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
        var baulId = await _fixture.CreateBaulAsync("Familia");
        var olderChapterId = await _fixture.AddChapterAsync(baulId, "Antiguo", photoCount: 1);
        var recentChapterId = await _fixture.AddChapterAsync(baulId, "Reciente", photoCount: 1);
        var undatedChapterId = await _fixture.AddChapterAsync(baulId, "Sin fecha");
        await _fixture.AddPhotoAsync(baulId, olderChapterId, "k1", PhotoDates.Of(2015, null, null));
        await _fixture.AddPhotoAsync(baulId, recentChapterId, "k2", PhotoDates.Of(2022, null, null));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetByBaulIdAsync(baulId);

        Assert.True(result.IsSuccess);
        var ids = result.Value.Select(a => a.Id).ToList();
        Assert.Equal([olderChapterId.ToString(), recentChapterId.ToString(), undatedChapterId.ToString()], ids);
    }

    [Fact]
    public async Task DeleteAsync_ShouldRemoveChapter_AndLoosenItsPhotosAndRecuerdos_ForCustodio()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia", chapterCount: 1);
        var chapterId = await _fixture.AddChapterAsync(baulId, "Chapter", photoCount: 1);
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);
        await _fixture.Recuerdos.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), photoId, chapterId, baulId, new UserId(CustodioId), "con foto", _fixture.Clock.UtcNow()));
        await _fixture.Recuerdos.CreateAsync(new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, chapterId, baulId, new UserId(CustodioId), "sin foto", _fixture.Clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        var result = await manager.DeleteAsync(chapterId);

        Assert.True(result.IsSuccess);
        Assert.Null(await _fixture.Chapters.GetByIdAsync(chapterId));

        var photo = await _fixture.Photos.GetByIdAsync(photoId);
        Assert.Null(photo!.ChapterId);
        Assert.Equal(baulId, photo.BaulId);

        var recuerdos = (await _fixture.Recuerdos.GetByBaulIdAsync(baulId)).ToList();
        Assert.Equal(2, recuerdos.Count);
        Assert.All(recuerdos, r => Assert.Null(r.ChapterId));

        var baul = await _fixture.Baules.GetByIdAsync(baulId);
        Assert.Equal(0, baul!.ChapterCount);
    }

    [Fact]
    public async Task DeleteAsync_ShouldDenyAccess_ForColaboradorRole()
    {
        var baulId = await _fixture.CreateBaulAsync("Familia", chapterCount: 1);
        const string colaboradorId = "colaborador-1";
        await _fixture.AddColaboradorAsync(baulId, colaboradorId);
        var chapterId = await _fixture.AddChapterAsync(baulId, "Chapter");

        var manager = CreateManager(colaboradorId);
        var result = await manager.DeleteAsync(chapterId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
        Assert.NotNull(await _fixture.Chapters.GetByIdAsync(chapterId));
    }

    [Fact]
    public async Task DeleteAsync_ShouldFail_WhenChapterDoesNotExist()
    {
        var manager = CreateManager(CustodioId);
        var result = await manager.DeleteAsync(new ChapterId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal("Chapter not found", result.Error.Message);
    }
}
