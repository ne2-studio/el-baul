using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Feed.Application;
using ElBaul.Core.Personas.Application;
using ElBaul.Core.Photos.Application;
using ElBaul.Core.Recuerdos.Application;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using ElBaul.Tests.Fixtures;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class BaulFeedManagerTests
{
    private const string CustodioId = BaulFixture.DefaultCustodioId;

    private readonly BaulFixture _fixture = new();
    private readonly FakePhotoStorage _photoStorage = new();
    // Shared across every CreateManager() call in a test (like _fixture's own repositories) so
    // a second GetFeedAsync call in the same test sees the cursor the first call advanced.
    private readonly InMemoryBaulFeedCursorRepository _feedCursors = new();

    private RecuerdoManager CreateRecuerdoManager(string currentUserId) =>
        new(NullLogger<RecuerdoManager>.Instance, _fixture.Chapters, _fixture.Photos, _fixture.Recuerdos,
            new InMemoryRecuerdoListReadModel(_fixture.Recuerdos, _fixture.Photos, _fixture.Chapters),
            new InMemoryRecuerdoEmbeddingRepository(), new StaticIdGenerator(Guid.NewGuid()), _fixture.Clock,
            new StaticCurrentUserProvider(currentUserId), _photoStorage,
            new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            new AuthorInfoProjector(_fixture.Personas, _fixture.Photos, _photoStorage), new FakeUnitOfWork());

    // Mirrors PhotoManagerTests.CreateManager — needed here to exercise AddToBaulAsync/
    // AddAssetToBaulAsync/AddAssetsToBaulBatchAsync through the real PhotoManager and observe
    // their effect on the feed, which is where issue #81 (missing feed card for photos added
    // from Mis fotos / another baúl) is actually observable.
    private PhotoManager CreatePhotoManager(string currentUserId) =>
        new(NullLogger<PhotoManager>.Instance, _fixture.Photos, _fixture.Chapters,
            new StaticCurrentUserProvider(currentUserId),
            new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            new PhotoLifecycleService(_fixture.Photos, _fixture.ChapterPhotoCountListener, _fixture.BaulPhotoCoverListener, _fixture.Clock),
            new PhotoDtoProjector(_photoStorage, _fixture.Recuerdos, _fixture.Clock),
            new PhotoUploadWorkflow(
                NullLogger<PhotoUploadWorkflow>.Instance, _fixture.Photos,
                new PhotoFileService(
                    NullLogger<PhotoFileService>.Instance, _photoStorage, new StaticIdGenerator(Guid.NewGuid()),
                    new FakePhotoDateExtractor(), new FakePhotoImageNormalizer(), new FakeImageProcessor(), new ImagePolicy()),
                new StaticIdGenerator(Guid.NewGuid()), _fixture.Clock, new FakeUnitOfWork()),
            new MyPhotosReadManager(
                _fixture.Photos, new StaticCurrentUserProvider(currentUserId),
                new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance), _photoStorage),
            new StaticIdGenerator(Guid.NewGuid()), _fixture.Clock, new FakeUnitOfWork());

    private BaulFeedManager CreateManager(string currentUserId) =>
        new(CreateRecuerdoManager(currentUserId),
            new InMemoryPhotoUploadBatchReadModel(_fixture.Photos, _fixture.Recuerdos, _fixture.Chapters),
            new PhotoDtoProjector(_photoStorage, _fixture.Recuerdos, _fixture.Clock),
            new AuthorInfoProjector(_fixture.Personas, _fixture.Photos, _photoStorage),
            _fixture.Chapters, _fixture.Photos, new CoverUrlResolver(_photoStorage), _feedCursors,
            new StaticCurrentUserProvider(currentUserId),
            new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            _fixture.Clock);

    [Fact]
    public async Task GetFeedAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var manager = CreateManager("stranger");

        var result = await manager.GetFeedAsync(baulId, 0, 20);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task GetFeedAsync_ShouldMergeRecuerdosPhotoBatchesAndChapters_NewestFirst()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        // StaticClock's "now" is fixed at construction — backdate the batch's photos well
        // before it so a recuerdo created "now" (via CreateRecuerdoAsync, which always stamps
        // clock.UtcNow()) reliably sorts after it, proving the merge sorts across all 3 kinds.
        var backdated = _fixture.Clock.UtcNow().AddMinutes(-20);

        var batchId = Guid.NewGuid();
        await _fixture.AddPhotoAsync(baulId, chapterId, uploadBatchId: batchId, createdAt: backdated);
        await _fixture.AddPhotoAsync(baulId, chapterId, uploadBatchId: batchId, createdAt: backdated.AddSeconds(30));

        var recuerdoManager = CreateRecuerdoManager(CustodioId);
        var recuerdo = await recuerdoManager.CreateRecuerdoAsync(baulId, "Un recuerdo bonito");
        Assert.True(recuerdo.IsSuccess);

        var manager = CreateManager(CustodioId);
        var result = await manager.GetFeedAsync(baulId, 0, 20);

        Assert.True(result.IsSuccess);
        var items = result.Value.Items;
        Assert.Equal(3, items.Count);
        Assert.False(result.Value.HasMore);
        // The recuerdo and the chapter's own creation share the same "now" instant — the merge
        // order (recuerdos, then batches, then chapters) breaks the tie, so recuerdo sorts first.
        Assert.Equal("recuerdo", items[0].Type);
        Assert.Equal("chapter_created", items[1].Type);
        Assert.Equal(chapterId.ToString(), items[1].ChapterCreated!.ChapterId);
        Assert.Equal("photo_batch", items[2].Type);
        Assert.Equal(2, items[2].PhotoBatch!.PhotoCount);
        Assert.Equal(batchId.ToString(), items[2].PhotoBatch!.BatchId);
        Assert.Equal(chapterId.ToString(), items[2].PhotoBatch!.ChapterId);
    }

    // GitHub issue #81: publishing a photo from "Mis fotos" (or from another baúl) into a baúl
    // never showed up in that baúl's feed, because CreateFromExistingAsset never set
    // UploadBatchId and GetFeedAsync only surfaces photos that have one (via
    // IPhotoUploadBatchReadModel).
    [Fact]
    public async Task GetFeedAsync_ShouldShowAPhotoBatchCard_ForAPhotoAddedFromMisFotos()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var otherBaulId = await _fixture.CreateBaulAsync("Otro");
        var sourcePhotoId = await _fixture.AddPhotoAsync(otherBaulId, uploadedBy: CustodioId);
        var assetId = new PhotoAssetId(sourcePhotoId.Value);

        var photoManager = CreatePhotoManager(CustodioId);
        var addResult = await photoManager.AddAssetToBaulAsync(assetId, baulId);
        Assert.True(addResult.IsSuccess);

        var manager = CreateManager(CustodioId);
        var result = await manager.GetFeedAsync(baulId, 0, 20);

        Assert.True(result.IsSuccess);
        var batchItem = Assert.Single(result.Value.Items, i => i.Type == "photo_batch");
        Assert.Equal(1, batchItem.PhotoBatch!.PhotoCount);
    }

    // Same root cause, baúl-to-baúl flow (PhotoManager.AddToBaulAsync, issue #62 Slice 2).
    [Fact]
    public async Task GetFeedAsync_ShouldShowAPhotoBatchCard_ForAPhotoAddedFromAnotherBaul()
    {
        var sourceBaulId = await _fixture.CreateBaulAsync("Origen");
        var targetBaulId = await _fixture.CreateBaulAsync("Destino");
        var sourcePhotoId = await _fixture.AddPhotoAsync(sourceBaulId, uploadedBy: CustodioId);

        var photoManager = CreatePhotoManager(CustodioId);
        var addResult = await photoManager.AddToBaulAsync(sourcePhotoId, targetBaulId);
        Assert.True(addResult.IsSuccess);

        var manager = CreateManager(CustodioId);
        var result = await manager.GetFeedAsync(targetBaulId, 0, 20);

        Assert.True(result.IsSuccess);
        var batchItem = Assert.Single(result.Value.Items, i => i.Type == "photo_batch");
        Assert.Equal(1, batchItem.PhotoBatch!.PhotoCount);
    }

    // Several assets added together in one Mis fotos multi-select must render as a single
    // grouped card, sharing one UploadBatchId — same grouping a multi-photo upload gets today.
    [Fact]
    public async Task GetFeedAsync_ShouldGroupAssetsAddedTogetherFromMisFotos_IntoOneBatchCard()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var otherBaulId = await _fixture.CreateBaulAsync("Otro");
        var assetIdA = new PhotoAssetId((await _fixture.AddPhotoAsync(otherBaulId, uploadedBy: CustodioId)).Value);
        var assetIdB = new PhotoAssetId((await _fixture.AddPhotoAsync(otherBaulId, uploadedBy: CustodioId)).Value);

        var photoManager = CreatePhotoManager(CustodioId);
        var batchResult = await photoManager.AddAssetsToBaulBatchAsync([assetIdA, assetIdB], baulId);
        Assert.True(batchResult.IsSuccess);
        Assert.Equal(2, batchResult.Value.Count());

        var manager = CreateManager(CustodioId);
        var result = await manager.GetFeedAsync(baulId, 0, 20);

        Assert.True(result.IsSuccess);
        var batchItem = Assert.Single(result.Value.Items, i => i.Type == "photo_batch");
        Assert.Equal(2, batchItem.PhotoBatch!.PhotoCount);
    }

    [Fact]
    public async Task GetFeedAsync_ShouldLimitPreviewPhotosToFour_ButReportFullCount()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var batchId = Guid.NewGuid();
        for (var i = 0; i < 6; i++)
        {
            await _fixture.AddPhotoAsync(baulId, chapterId, uploadBatchId: batchId, createdAt: _fixture.Clock.UtcNow().AddSeconds(i));
        }

        var manager = CreateManager(CustodioId);
        var result = await manager.GetFeedAsync(baulId, 0, 20);

        Assert.True(result.IsSuccess);
        // CreateBaulWithChapterAsync also seeds a "chapter_created" card — pick the batch card
        // out explicitly rather than assuming it's the only item.
        var batch = result.Value.Items.Single(i => i.Type == "photo_batch").PhotoBatch!;
        Assert.Equal(6, batch.PhotoCount);
        Assert.Equal(4, batch.PreviewPhotos.Count);
    }

    [Fact]
    public async Task GetFeedAsync_ShouldIncludeChapterCreatedCard_WithAuthorAndCover()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync(chapterName: "Verano 2020");

        var manager = CreateManager(CustodioId);
        var result = await manager.GetFeedAsync(baulId, 0, 20);

        Assert.True(result.IsSuccess);
        var item = Assert.Single(result.Value.Items);
        Assert.Equal("chapter_created", item.Type);
        Assert.Equal(chapterId.ToString(), item.ChapterCreated!.ChapterId);
        Assert.Equal("Verano 2020", item.ChapterCreated!.Name);
    }

    [Fact]
    public async Task GetFeedAsync_ShouldMarkEverythingNew_OnFirstEverVisit()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var recuerdoManager = CreateRecuerdoManager(CustodioId);
        Assert.True((await recuerdoManager.CreateRecuerdoAsync(baulId, "Un recuerdo")).IsSuccess);

        var manager = CreateManager(CustodioId);
        var result = await manager.GetFeedAsync(baulId, 0, 20);

        // No cursor yet (never opened this baúl before) means everything already in it counts
        // as new — matching the workspace switcher's "no seen-at entry" dot, which marks a
        // never-visited baúl as having novedades until it's opened once.
        Assert.True(result.IsSuccess);
        Assert.All(result.Value.Items, item => Assert.True(item.IsNew));
    }

    [Fact]
    public async Task GetFeedAsync_ShouldMarkOnlyActivitySinceLastVisit_AsNew()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var recuerdoManager = CreateRecuerdoManager(CustodioId);
        Assert.True((await recuerdoManager.CreateRecuerdoAsync(baulId, "Recuerdo antiguo")).IsSuccess);

        var manager = CreateManager(CustodioId);
        // First visit: establishes the cursor; the pre-existing recuerdo is new since there was
        // no earlier cursor to compare against.
        var firstVisit = await manager.GetFeedAsync(baulId, 0, 20);
        Assert.True(firstVisit.IsSuccess);
        Assert.All(firstVisit.Value.Items, item => Assert.True(item.IsNew));

        // Activity that arrives strictly after the cursor set by the first visit.
        var afterCursor = _fixture.Clock.UtcNow().AddMinutes(5);
        var newBatchId = Guid.NewGuid();
        await _fixture.AddPhotoAsync(baulId, chapterId, uploadBatchId: newBatchId, createdAt: afterCursor);

        var secondVisit = await manager.GetFeedAsync(baulId, 0, 20);
        Assert.True(secondVisit.IsSuccess);
        var items = secondVisit.Value.Items;
        Assert.Equal(3, items.Count);
        var newItem = Assert.Single(items, i => i.Type == "photo_batch");
        Assert.True(newItem.IsNew);
        Assert.All(items.Where(i => i.Type != "photo_batch"), item => Assert.False(item.IsNew));
    }

    [Fact]
    public async Task GetFeedAsync_ShouldWidenFirstPage_ToFitAllNewItems_WithoutCuttingThemOff()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var manager = CreateManager(CustodioId);
        // Establishes the cursor against an empty feed.
        Assert.True((await manager.GetFeedAsync(baulId, 0, 20)).IsSuccess);

        var afterCursor = _fixture.Clock.UtcNow().AddMinutes(1);
        for (var i = 0; i < 5; i++)
        {
            await _fixture.AddPhotoAsync(baulId, uploadBatchId: Guid.NewGuid(), createdAt: afterCursor.AddSeconds(i));
        }

        var result = await manager.GetFeedAsync(baulId, 0, 2);

        Assert.True(result.IsSuccess);
        Assert.Equal(5, result.Value.Items.Count);
        Assert.False(result.Value.HasMore);
        Assert.All(result.Value.Items, item => Assert.True(item.IsNew));
    }

    [Fact]
    public async Task GetFeedAsync_ShouldReportHasMore_WhenMoreItemsRemainAfterThisPage()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var manager = CreateManager(CustodioId);
        // Prime the cursor against an empty feed first, so the items below aren't "new" and
        // don't trigger the first-page widening tested separately.
        Assert.True((await manager.GetFeedAsync(baulId, 0, 20)).IsSuccess);

        var recuerdoManager = CreateRecuerdoManager(CustodioId);
        for (var i = 0; i < 3; i++)
        {
            var created = await recuerdoManager.CreateRecuerdoAsync(baulId, $"Recuerdo {i}");
            Assert.True(created.IsSuccess);
        }

        var result = await manager.GetFeedAsync(baulId, 0, 2);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Items.Count);
        Assert.True(result.Value.HasMore);
    }

    [Fact]
    public async Task GetFeedAsync_ShouldReportNoMore_OnTheLastPage()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var manager = CreateManager(CustodioId);
        // Prime the cursor against an empty feed first, so the items below aren't "new" and
        // don't trigger the first-page widening tested separately.
        Assert.True((await manager.GetFeedAsync(baulId, 0, 20)).IsSuccess);

        var recuerdoManager = CreateRecuerdoManager(CustodioId);
        for (var i = 0; i < 3; i++)
        {
            var created = await recuerdoManager.CreateRecuerdoAsync(baulId, $"Recuerdo {i}");
            Assert.True(created.IsSuccess);
        }

        var result = await manager.GetFeedAsync(baulId, 2, 2);

        Assert.True(result.IsSuccess);
        Assert.Single(result.Value.Items);
        Assert.False(result.Value.HasMore);
    }

    [Fact]
    public async Task GetFeedAsync_ShouldAdvanceThroughDistinctItems_AsSkipIncreases()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var manager = CreateManager(CustodioId);
        // Prime the cursor against an empty feed first, so the items below aren't "new" and
        // don't trigger the first-page widening tested separately.
        Assert.True((await manager.GetFeedAsync(baulId, 0, 20)).IsSuccess);

        var recuerdoManager = CreateRecuerdoManager(CustodioId);
        for (var i = 0; i < 5; i++)
        {
            var created = await recuerdoManager.CreateRecuerdoAsync(baulId, $"Recuerdo {i}");
            Assert.True(created.IsSuccess);
        }

        var firstPage = await manager.GetFeedAsync(baulId, 0, 2);
        var secondPage = await manager.GetFeedAsync(baulId, 2, 2);

        Assert.True(firstPage.IsSuccess);
        Assert.True(secondPage.IsSuccess);
        var firstIds = firstPage.Value.Items.Select(i => i.Recuerdo!.Id).ToHashSet();
        var secondIds = secondPage.Value.Items.Select(i => i.Recuerdo!.Id).ToHashSet();
        Assert.Empty(firstIds.Intersect(secondIds));
    }

    [Fact]
    public async Task GetFeedAsync_ShouldClampTake_ToAReasonableMaximum()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var recuerdoManager = CreateRecuerdoManager(CustodioId);
        for (var i = 0; i < 3; i++)
        {
            var created = await recuerdoManager.CreateRecuerdoAsync(baulId, $"Recuerdo {i}");
            Assert.True(created.IsSuccess);
        }

        var manager = CreateManager(CustodioId);
        var result = await manager.GetFeedAsync(baulId, 0, 10_000);

        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Value.Items.Count);
        Assert.False(result.Value.HasMore);
    }

    // Regression (GitHub #69): "seen / unseen" for a baúl must be per-user and
    // server-authoritative — driven by the same BaulFeedCursor, not by device-local
    // localStorage. MarkBaulSeenAsync is the entry the workspace switcher / BaulScopeAggregator
    // use to advance that watermark on every baúl entry, on any tab, regardless of the feed
    // feature flag.

    [Fact]
    public async Task MarkBaulSeenAsync_ShouldAdvanceTheCursor_SoAlreadySeenActivityIsNotRemarkedNew()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var recuerdoManager = CreateRecuerdoManager(CustodioId);
        Assert.True((await recuerdoManager.CreateRecuerdoAsync(baulId, "Un recuerdo")).IsSuccess);

        var manager = CreateManager(CustodioId);

        // Opening the baúl on any tab (not just Historia) marks it seen for this user.
        Assert.True((await manager.MarkBaulSeenAsync(baulId)).IsSuccess);

        // A later feed read for the same user — from any device — now tags nothing as new.
        var feed = await manager.GetFeedAsync(baulId, 0, 20);
        Assert.True(feed.IsSuccess);
        Assert.NotEmpty(feed.Value.Items);
        Assert.All(feed.Value.Items, item => Assert.False(item.IsNew));
    }

    [Fact]
    public async Task MarkBaulSeenAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var stranger = CreateManager("stranger");

        var result = await stranger.MarkBaulSeenAsync(baulId);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task GetSeenWatermarksAsync_ShouldReturnOnlyTheCurrentUsersWatermarks()
    {
        var baulId = await _fixture.CreateBaulAsync();
        Assert.True((await CreateManager(CustodioId).MarkBaulSeenAsync(baulId)).IsSuccess);

        var otherUsersView = await CreateManager("someone-else").GetSeenWatermarksAsync();

        Assert.False(otherUsersView.ContainsKey(baulId));
    }

}
