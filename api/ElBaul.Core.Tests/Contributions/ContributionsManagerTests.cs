using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Contributions;
using ElBaul.Core.Contributions.Application;
using ElBaul.Core.Photos.Application;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using ElBaul.Tests.Fixtures;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class ContributionsManagerTests
{
    private const string CustodioId = BaulFixture.DefaultCustodioId;

    private readonly BaulFixture _fixture = new();
    private readonly FakePhotoStorage _photoStorage = new();

    private IPhotoListReadModel CreatePhotoListReadModel() =>
        new InMemoryPhotoListReadModel(_fixture.Photos, _fixture.Recuerdos, _fixture.PhotoPersonaTags);

    private PhotoDtoProjector CreatePhotoDtoProjector() => new(_photoStorage, _fixture.Recuerdos, _fixture.Clock);

    private ContributionsManager CreateManager(string currentUserId, double writeMemorySuggestionRatio = 0.2) =>
        new(CreatePhotoListReadModel(), CreatePhotoDtoProjector(), new StaticCurrentUserProvider(currentUserId),
            new BaulAccessService(_fixture.Baules, _fixture.Personas, NullLogger<BaulAccessService>.Instance),
            new StaticAppConfiguration(writeMemorySuggestionRatio: writeMemorySuggestionRatio));

    [Fact]
    public async Task GetSuggestionAsync_ShouldReturnNull_WhenBaulHasNoPhotos()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();

        var result = await CreateManager(CustodioId).GetSuggestionAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value);
    }

    [Fact]
    public async Task GetSuggestionAsync_ShouldSuggestTaggingAnUntaggedPhoto_WhenRatioForcesTag()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);

        // NextDouble() lives in [0.0, 1.0) so it's never < 0.0 — deterministically picks "tag".
        var result = await CreateManager(CustodioId, writeMemorySuggestionRatio: 0.0).GetSuggestionAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(ContributionSuggestionType.Tag, result.Value!.Type);
        Assert.Equal(photoId.ToString(), result.Value.Photo.Id);
    }

    [Fact]
    public async Task GetSuggestionAsync_ShouldSuggestWritingAMemory_WhenRatioForcesMemory()
    {
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);

        // NextDouble() is always < 1.0 — deterministically picks "memory".
        var result = await CreateManager(CustodioId, writeMemorySuggestionRatio: 1.0).GetSuggestionAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(ContributionSuggestionType.Memory, result.Value!.Type);
        Assert.Equal(photoId.ToString(), result.Value.Photo.Id);
    }

    [Fact]
    public async Task GetSuggestionAsync_ShouldReturnNull_WhenTheChosenTypeHasNoCandidate_EvenIfTheOtherTypeDoes()
    {
        // Every photo already has a recuerdo, so there's nothing to suggest for "memory" — but
        // none are tagged, so "tag" has a candidate. Forcing "memory" must still return null: no
        // fallback to the other type, matching the two old endpoints' independent behavior.
        var (baulId, chapterId) = await _fixture.CreateBaulWithChapterAsync();
        var photoId = await _fixture.AddPhotoAsync(baulId, chapterId);
        await _fixture.Recuerdos.CreateAsync(new Recuerdo(
            new RecuerdoId(Guid.NewGuid()), photoId, chapterId, baulId, new UserId(CustodioId), "Un recuerdo", _fixture.Clock.UtcNow()));

        var result = await CreateManager(CustodioId, writeMemorySuggestionRatio: 1.0).GetSuggestionAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value);
    }

    [Fact]
    public async Task GetSuggestionAsync_ShouldDenyAccess_ForUserWithNoRelationToBaul()
    {
        var (baulId, _) = await _fixture.CreateBaulWithChapterAsync();

        var result = await CreateManager("stranger").GetSuggestionAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
    }
}
