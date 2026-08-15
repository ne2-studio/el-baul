using ElBaul.Application.Chat;
using ElBaul.Infra.Lite;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;
using Ne2Studio.Common;
using ElBaul.Domain;

namespace ElBaul.Tests;

public class RelevantRecuerdoSelectorTests
{
    private const string CustodioId = "custodio-1";

    private readonly InMemoryRecuerdoEmbeddingRepository _embeddingRepository = new();
    private readonly StaticClock _clock = new();

    private RelevantRecuerdoSelector CreateSelector(IEmbeddingBackend? embeddingBackend = null) =>
        new(NullLogger<RelevantRecuerdoSelector>.Instance, _embeddingRepository,
            embeddingBackend ?? new FakeEmbeddingBackend([]), _clock);

    [Fact]
    public async Task SelectAsync_ShouldReturnAllRecuerdos_WithoutEmbedding_WhenAtOrBelowTheLimit()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var recuerdos = Enumerable.Range(0, 20)
            .Select(i => CreateRecuerdo(baulId, $"Recuerdo {i}", _clock.UtcNow().AddDays(i)))
            .ToList();

        var embeddingBackend = new FakeEmbeddingBackend([])
        {
            NextEmbedResult = Result.Failure<float[]>(ApplicationError.ExternalDependencyUnavailable("Should not embed query")),
            NextEmbedManyResult = Result.Failure<IReadOnlyList<float[]>>(ApplicationError.ExternalDependencyUnavailable("Should not embed recuerdos"))
        };

        var selected = await CreateSelector(embeddingBackend).SelectAsync(baulId, recuerdos, "consulta");

        Assert.Equal(recuerdos, selected);
        Assert.Empty(await _embeddingRepository.GetByBaulIdAsync(baulId));
    }

    [Fact]
    public async Task SelectAsync_ShouldOrderBySimilarity_WhenEmbeddingsAreAvailable()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var relevant = CreateRecuerdo(baulId, "Fuimos a Asturias en verano", _clock.UtcNow());
        var recuerdos = new[] { relevant }
            .Concat(Enumerable.Range(0, 25).Select(i => CreateRecuerdo(baulId, $"Recuerdo de relleno numero {i}", _clock.UtcNow().AddDays(-i - 1))))
            .ToList();

        var selected = await CreateSelector(new FakeEmbeddingBackend(["asturias", "relleno"]))
            .SelectAsync(baulId, recuerdos, "¿Qué sabemos del viaje a Asturias?");

        Assert.Equal(20, selected.Count);
        Assert.Equal(relevant.Id, selected[0].Id);
        Assert.DoesNotContain(recuerdos[^1], selected);
    }

    [Fact]
    public async Task SelectAsync_ShouldRefreshStaleEmbeddings_BeforeRanking()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var stale = CreateRecuerdo(baulId, "Asturias", _clock.UtcNow());
        var recuerdos = new[] { stale }
            .Concat(Enumerable.Range(0, 20).Select(i => CreateRecuerdo(baulId, $"Relleno {i}", _clock.UtcNow().AddDays(-i - 1))))
            .ToList();
        await _embeddingRepository.CreateManyAsync([
            new RecuerdoEmbedding(stale.Id, baulId, [0f, 1f], "old-model", _clock.UtcNow().AddDays(-1))
        ]);

        var embeddingBackend = new FakeEmbeddingBackend(["asturias", "relleno"]) { ModelId = "new-model" };

        var selected = await CreateSelector(embeddingBackend).SelectAsync(baulId, recuerdos, "Asturias");
        var refreshed = (await _embeddingRepository.GetByBaulIdAsync(baulId)).Single(e => e.RecuerdoId == stale.Id);

        Assert.Equal(stale.Id, selected[0].Id);
        Assert.Equal("new-model", refreshed.Model);
    }

    [Fact]
    public async Task SelectAsync_ShouldRankWithExistingEmbeddings_WhenRefreshingMissingEmbeddingsFails()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var indexed = CreateRecuerdo(baulId, "Asturias ya indexado", _clock.UtcNow());
        var missing = CreateRecuerdo(baulId, "Asturias sin embedding", _clock.UtcNow().AddDays(-1));
        var recuerdos = new[] { indexed, missing }
            .Concat(Enumerable.Range(0, 20).Select(i => CreateRecuerdo(baulId, $"Relleno {i}", _clock.UtcNow().AddDays(-i - 2))))
            .ToList();
        await _embeddingRepository.CreateManyAsync([
            new RecuerdoEmbedding(indexed.Id, baulId, [1f], "fake-embedding-model", _clock.UtcNow())
        ]);
        var embeddingBackend = new FakeEmbeddingBackend(["asturias"])
        {
            NextEmbedManyResult = Result.Failure<IReadOnlyList<float[]>>(ApplicationError.ExternalDependencyUnavailable("Embedding backend unavailable"))
        };

        var selected = await CreateSelector(embeddingBackend).SelectAsync(baulId, recuerdos, "Asturias");

        Assert.Equal([indexed], selected);
    }

    [Fact]
    public async Task SelectAsync_ShouldFallBackToMostRecentRecuerdos_WhenEmbeddingTheQueryFails()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var mostRecent = CreateRecuerdo(baulId, "El más reciente", _clock.UtcNow());
        var recuerdos = new[] { mostRecent }
            .Concat(Enumerable.Range(0, 25).Select(i => CreateRecuerdo(baulId, $"Recuerdo antiguo {i}", _clock.UtcNow().AddDays(-i - 1))))
            .ToList();
        var embeddingBackend = new FakeEmbeddingBackend([])
        {
            NextEmbedResult = Result.Failure<float[]>(ApplicationError.ExternalDependencyUnavailable("Embedding backend unavailable"))
        };

        var selected = await CreateSelector(embeddingBackend).SelectAsync(baulId, recuerdos, "¿Qué sabemos de la familia?");

        Assert.Equal(20, selected.Count);
        Assert.Equal(mostRecent.Id, selected[0].Id);
    }

    private static Recuerdo CreateRecuerdo(BaulId baulId, string text, DateTime createdAt) =>
        new(new RecuerdoId(Guid.NewGuid()), null, null, baulId, new UserId(CustodioId), text, createdAt);
}
