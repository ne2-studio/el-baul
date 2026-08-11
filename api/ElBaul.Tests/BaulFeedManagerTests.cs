using ElBaul.Application.Bauls;
using ElBaul.Application.Feed;
using ElBaul.Application.Personas;
using ElBaul.Application.Photos;
using ElBaul.Application.Recuerdos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.Shared;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using ElBaul.Tests.Fixtures;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Tests;

public class BaulFeedManagerTests
{
    private const string CustodioId = BaulFixture.DefaultCustodioId;

    private readonly BaulFixture _fixture = new();
    private readonly FakePhotoStorage _photoStorage = new();

    private RecuerdoManager CreateRecuerdoManager(string currentUserId) =>
        new(NullLogger<RecuerdoManager>.Instance, _fixture.Chapters, _fixture.Photos, _fixture.Recuerdos,
            new InMemoryRecuerdoListReadModel(_fixture.Recuerdos, _fixture.Photos, _fixture.Chapters),
            new InMemoryRecuerdoEmbeddingRepository(), new StaticIdGenerator(Guid.NewGuid()), _fixture.Clock,
            new StaticCurrentUserProvider(currentUserId), _photoStorage,
            new BaulAccessService(_fixture.Baules, NullLogger<BaulAccessService>.Instance),
            new AuthorInfoProjector(_fixture.Baules, _fixture.Photos, _photoStorage));

    private BaulFeedManager CreateManager(string currentUserId, bool baulFeedEnabled = true) =>
        new(NullLogger<BaulFeedManager>.Instance, CreateRecuerdoManager(currentUserId),
            new InMemoryPhotoUploadBatchReadModel(_fixture.Photos, _fixture.Recuerdos, _fixture.Chapters),
            new PhotoDtoProjector(_photoStorage, _fixture.Recuerdos),
            new AuthorInfoProjector(_fixture.Baules, _fixture.Photos, _photoStorage),
            new StaticAppConfiguration(baulFeedEnabled: baulFeedEnabled),
            new StaticCurrentUserProvider(currentUserId),
            new BaulAccessService(_fixture.Baules, NullLogger<BaulAccessService>.Instance));

    [Fact]
    public async Task GetFeedAsync_ShouldFail_WhenFeatureDisabled()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var manager = CreateManager(CustodioId, baulFeedEnabled: false);

        var result = await manager.GetFeedAsync(baulId, 0, 20);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task GetFeedAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var manager = CreateManager("stranger");

        var result = await manager.GetFeedAsync(baulId, 0, 20);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task GetFeedAsync_ShouldMergeRecuerdosAndPhotoBatches_NewestFirst()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        // StaticClock's "now" is fixed at construction — backdate the batch's photos well
        // before it so a recuerdo created "now" (via CreateRecuerdoAsync, which always stamps
        // clock.UtcNow()) reliably sorts after it, proving the merge sorts across both kinds.
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
        Assert.Equal(2, items.Count);
        Assert.False(result.Value.HasMore);
        Assert.Equal("recuerdo", items[0].Type);
        Assert.Equal("photo_batch", items[1].Type);
        Assert.Equal(2, items[1].PhotoBatch!.PhotoCount);
        Assert.Equal(batchId.ToString(), items[1].PhotoBatch!.BatchId);
        Assert.Equal(chapterId.ToString(), items[1].PhotoBatch!.ChapterId);
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
        var batch = Assert.Single(result.Value.Items).PhotoBatch!;
        Assert.Equal(6, batch.PhotoCount);
        Assert.Equal(4, batch.PreviewPhotos.Count);
    }

    [Fact]
    public async Task GetFeedAsync_ShouldReportHasMore_WhenMoreItemsRemainAfterThisPage()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var recuerdoManager = CreateRecuerdoManager(CustodioId);
        for (var i = 0; i < 3; i++)
        {
            var created = await recuerdoManager.CreateRecuerdoAsync(baulId, $"Recuerdo {i}");
            Assert.True(created.IsSuccess);
        }

        var manager = CreateManager(CustodioId);
        var result = await manager.GetFeedAsync(baulId, 0, 2);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Items.Count);
        Assert.True(result.Value.HasMore);
    }

    [Fact]
    public async Task GetFeedAsync_ShouldReportNoMore_OnTheLastPage()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var recuerdoManager = CreateRecuerdoManager(CustodioId);
        for (var i = 0; i < 3; i++)
        {
            var created = await recuerdoManager.CreateRecuerdoAsync(baulId, $"Recuerdo {i}");
            Assert.True(created.IsSuccess);
        }

        var manager = CreateManager(CustodioId);
        var result = await manager.GetFeedAsync(baulId, 2, 2);

        Assert.True(result.IsSuccess);
        Assert.Single(result.Value.Items);
        Assert.False(result.Value.HasMore);
    }

    [Fact]
    public async Task GetFeedAsync_ShouldAdvanceThroughDistinctItems_AsSkipIncreases()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var recuerdoManager = CreateRecuerdoManager(CustodioId);
        for (var i = 0; i < 5; i++)
        {
            var created = await recuerdoManager.CreateRecuerdoAsync(baulId, $"Recuerdo {i}");
            Assert.True(created.IsSuccess);
        }

        var manager = CreateManager(CustodioId);
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

    [Fact]
    public async Task GetBatchPhotosAsync_ShouldReturnOnlyThatBatchsPhotos()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var batchId = Guid.NewGuid();
        var otherBatchId = Guid.NewGuid();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId, uploadBatchId: batchId);
        await _fixture.AddPhotoAsync(baulId, chapterId, uploadBatchId: otherBatchId);

        var manager = CreateManager(CustodioId);
        var result = await manager.GetBatchPhotosAsync(baulId, batchId);

        Assert.True(result.IsSuccess);
        var photo = Assert.Single(result.Value);
        Assert.Equal(photoId.ToString(), photo.Id);
    }

    [Fact]
    public async Task GetBatchPhotosAsync_ShouldFail_WhenBatchDoesNotExist()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var manager = CreateManager(CustodioId);

        var result = await manager.GetBatchPhotosAsync(baulId, Guid.NewGuid());

        Assert.True(result.IsFailure);
    }
}
