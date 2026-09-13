using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Photos.Application;

using ElBaul.Tests.Fakes;
using ElBaul.Tests.Fixtures;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests.Photos;

// "Mis fotos" read path (docs/.backlog issue #62) — a projection over PhotoAsset, not Photo,
// so its tests focus on the two things PhotoReadManagerTests can't: deduplication across
// baúles sharing one asset, and authorization derived from the caller rather than a
// client-supplied BaulId. See PhotoManagerTests for the fixture/factory conventions this
// mirrors.
public class MyPhotosReadManagerTests
{
    private const string CustodioId = BaulFixture.DefaultCustodioId;
    private const string OtherUserId = "other-user";

    private readonly BaulFixture _fixture = new();
    private readonly FakePhotoStorage _photoStorage = new();

    private MyPhotosReadManager CreateManager() =>
        new(_fixture.Photos, new StaticCurrentUserProvider(CustodioId),
            new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            _photoStorage);

    // Shares an existing Photo's asset into another baúl exactly the way
    // PhotoManager.AddToBaulAsync/Photo.CreateFromExistingAsset does — see
    // ElBaul.Infra.PersistenceTests.PhotoAssetTests for the same pattern against real Postgres.
    private async Task<PhotoId> ShareIntoBaulAsync(PhotoId sourcePhotoId, BaulId targetBaulId, string uploadedBy)
    {
        var source = (await _fixture.Photos.GetByIdAsync(sourcePhotoId))!;
        var shared = Photo.CreateFromExistingAsset(
            new PhotoId(Guid.NewGuid()), targetBaulId, source.PhotoAsset, source.TakenAt, new UserId(uploadedBy), _fixture.Clock.UtcNow());
        await _fixture.Photos.CreateAsync(shared);
        return shared.Id;
    }

    [Fact]
    public async Task GetMyPhotosAsync_ReturnsPhotosTheCurrentUserOriginallyUploaded()
    {
        var baulId = await _fixture.CreateBaulAsync();
        await _fixture.AddPhotoAsync(baulId, storageKey: "mine.jpg", uploadedBy: CustodioId);

        var result = await CreateManager().GetMyPhotosAsync(0, 60);

        Assert.True(result.IsSuccess);
        var item = Assert.Single(result.Value.Items);
        Assert.Contains("mine.jpg", item.ThumbnailUrl);
    }

    [Fact]
    public async Task GetMyPhotosAsync_DoesNotReturnAssetsUploadedByAnotherUser_EvenWhenSharedIntoAnAccessibleBaul()
    {
        var baulId = await _fixture.CreateBaulAsync(custodioId: CustodioId);
        await _fixture.AddColaboradorAsync(baulId, OtherUserId);
        // OtherUserId uploaded this one — merely being able to see it inside a shared baúl must
        // never make it show up as "mine".
        await _fixture.AddPhotoAsync(baulId, storageKey: "not-mine.jpg", uploadedBy: OtherUserId);

        var result = await CreateManager().GetMyPhotosAsync(0, 60);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value.Items);
    }

    [Fact]
    public async Task GetMyPhotosAsync_DeduplicatesOneAssetSharedIntoTwoBaules_IntoASingleEntry()
    {
        var baulA = await _fixture.CreateBaulAsync("Baúl A", CustodioId);
        var baulB = await _fixture.CreateBaulAsync("Baúl B", CustodioId);
        var sourcePhotoId = await _fixture.AddPhotoAsync(baulA, storageKey: "shared.jpg", uploadedBy: CustodioId);
        await ShareIntoBaulAsync(sourcePhotoId, baulB, CustodioId);

        var result = await CreateManager().GetMyPhotosAsync(0, 60);

        Assert.True(result.IsSuccess);
        Assert.Single(result.Value.Items);
    }

    [Fact]
    public async Task GetMyPhotosAsync_ListsEveryAccessibleBaulTheAssetAppearsIn()
    {
        var baulA = await _fixture.CreateBaulAsync("Baúl A", CustodioId);
        var baulB = await _fixture.CreateBaulAsync("Baúl B", CustodioId);
        var sourcePhotoId = await _fixture.AddPhotoAsync(baulA, storageKey: "shared.jpg", uploadedBy: CustodioId);
        await ShareIntoBaulAsync(sourcePhotoId, baulB, CustodioId);

        var result = await CreateManager().GetMyPhotosAsync(0, 60);

        var item = Assert.Single(result.Value.Items);
        var baulNames = item.Baules.Select(b => b.BaulName).OrderBy(n => n).ToList();
        Assert.Equal(["Baúl A", "Baúl B"], baulNames);
    }

    [Fact]
    public async Task GetMyPhotosAsync_NeverLeaksABaulTheCurrentUserCannotAccess()
    {
        // The asset was uploaded by the custodio, then shared into a baúl the custodio has since
        // lost visibility into (here: one they were never a member of at all) — its id/name must
        // never surface, even though a Photo row for it genuinely exists there.
        var myBaul = await _fixture.CreateBaulAsync("Mi baúl", CustodioId);
        var inaccessibleBaul = await _fixture.CreateBaulAsync("Baúl ajeno", OtherUserId);
        var sourcePhotoId = await _fixture.AddPhotoAsync(myBaul, storageKey: "shared.jpg", uploadedBy: CustodioId);
        await ShareIntoBaulAsync(sourcePhotoId, inaccessibleBaul, CustodioId);

        var result = await CreateManager().GetMyPhotosAsync(0, 60);

        var item = Assert.Single(result.Value.Items);
        var appearance = Assert.Single(item.Baules);
        Assert.Equal(myBaul.ToString(), appearance.BaulId);
        Assert.DoesNotContain(item.Baules, b => b.BaulName == "Baúl ajeno");
    }

    [Fact]
    public async Task GetMyPhotosAsync_ShowsAnAssetSharedByExactDuplicateUpload_ToEveryIndependentContributor()
    {
        // Slice 2.5 (docs/.backlog issue #62): both the original uploader and a later, unrelated
        // contributor who happened to upload the exact same bytes must each see the asset in
        // their own Mis fotos — neither one's UserPhotoAsset relation depends on the other's.
        var baulA = await _fixture.CreateBaulAsync("Baúl A", CustodioId);
        var sourcePhotoId = await _fixture.AddPhotoAsync(baulA, storageKey: "shared.jpg", uploadedBy: CustodioId);
        var source = (await _fixture.Photos.GetByIdAsync(sourcePhotoId))!;

        // OtherUserId independently contributes the exact same asset (mirrors
        // PhotoUploadWorkflow.ReuseAssetCoreAsync's TryCreateUserPhotoAssetAsync call).
        await _fixture.Photos.TryCreateUserPhotoAssetAsync(new UserId(OtherUserId), source.PhotoAssetId, _fixture.Clock.UtcNow());

        var pedrosResult = await CreateManager().GetMyPhotosAsync(0, 60);
        var otherResult = await new MyPhotosReadManager(
                _fixture.Photos, new StaticCurrentUserProvider(OtherUserId),
                new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance), _photoStorage)
            .GetMyPhotosAsync(0, 60);

        Assert.Single(pedrosResult.Value.Items);
        Assert.Single(otherResult.Value.Items);
        Assert.Equal(pedrosResult.Value.Items[0].Id, otherResult.Value.Items[0].Id);
        // OtherUserId isn't a member of baulA, so it never appears in their own view of it.
        Assert.Empty(otherResult.Value.Items[0].Baules);
    }

    [Fact]
    public async Task GetMyPhotosAsync_OrdersChronologically_UndatedLast()
    {
        var baulId = await _fixture.CreateBaulAsync();
        var undated = await _fixture.AddPhotoAsync(baulId, storageKey: "undated.jpg", date: null, createdAt: new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        var older = await _fixture.AddPhotoAsync(baulId, storageKey: "older.jpg", date: PhotoDate.Parse(2019, 1, 1).Value);
        var newer = await _fixture.AddPhotoAsync(baulId, storageKey: "newer.jpg", date: PhotoDate.Parse(2021, 6, 1).Value);

        var result = await CreateManager().GetMyPhotosAsync(0, 60);

        Assert.Equal(
            [older.ToString(), newer.ToString(), undated.ToString()],
            result.Value.Items.Select(i => i.Id));
    }
}
