using CSharpFunctionalExtensions;
using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Tests;

// RAG-ranking behavior in isolation from ChatManager's orchestration — see
// ChatContextBuilderApprovalTests for full-text snapshots of the prompt this builds.
public class ChatContextBuilderTests
{
    private const string CustodioId = "custodio-1";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly InMemoryRecuerdoEmbeddingRepository _recuerdoEmbeddingRepository = new();
    private readonly StaticClock _clock = new();

    private ChatContextBuilder CreateBuilder(IEmbeddingBackend? embeddingBackend = null) =>
        new(NullLogger<ChatContextBuilder>.Instance, _baulRepository, _chapterRepository, _recuerdoRepository,
            _recuerdoEmbeddingRepository, embeddingBackend ?? new FakeEmbeddingBackend([]), _clock);

    private async Task<Baul> SeedBaulAsync(Guid baulId, string name)
    {
        var now = _clock.UtcNow();
        var baul = new Baul(new BaulId(baulId), name, null, CustodioId, 0, now, now);
        await _baulRepository.CreateAsync(baul);
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), CustodioId, "Custodio", BaulRole.Custodio, now));
        return baul;
    }

    [Fact]
    public async Task BuildAsync_ShouldIncludeAllRecuerdos_WhenAtOrBelowTheLimit()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        _recuerdoRepository.SeedForBaul(new BaulId(baulId), new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baulId), CustodioId, "Fuimos a Asturias en verano", _clock.UtcNow()));

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, "¿Cuándo fue el viaje a Asturias?");

        Assert.Contains("Fuimos a Asturias en verano", context);
        Assert.Contains("Recuerdos (ordenados del más antiguo al más reciente):", context);
    }

    [Fact]
    public async Task BuildAsync_ShouldOnlyIncludeTheMostRelevantRecuerdos_WhenThereAreManyOfThem()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        var embeddingBackend = new FakeEmbeddingBackend(["asturias", "relleno"]);

        _recuerdoRepository.SeedForBaul(new BaulId(baulId), new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baulId), CustodioId, "Fuimos de viaje a Asturias en verano", _clock.UtcNow()));
        for (var i = 0; i < 25; i++)
        {
            _recuerdoRepository.SeedForBaul(new BaulId(baulId), new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baulId), CustodioId, $"Recuerdo de relleno numero {i}", _clock.UtcNow()));
        }

        var builder = CreateBuilder(embeddingBackend);
        var context = await builder.BuildAsync(baul, "¿Qué sabemos del viaje a Asturias?");

        Assert.Contains("Fuimos de viaje a Asturias en verano", context);
        Assert.Contains("recuerdos en total en el baúl", context);

        var includedFillerCount = Enumerable.Range(0, 25).Count(i => context.Contains($"Recuerdo de relleno numero {i}"));
        Assert.True(includedFillerCount < 25, "Some filler recuerdos should have been left out of the prompt");
    }

    [Fact]
    public async Task BuildAsync_ShouldFallBackToMostRecentRecuerdos_WhenEmbeddingTheQueryFails()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        var embeddingBackend = new FakeEmbeddingBackend([])
        {
            NextEmbedResult = Result.Failure<float[]>("Embedding backend unavailable")
        };

        var mostRecent = new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baulId), CustodioId, "El más reciente", _clock.UtcNow());
        _recuerdoRepository.SeedForBaul(new BaulId(baulId), mostRecent);
        for (var i = 0; i < 25; i++)
        {
            _recuerdoRepository.SeedForBaul(new BaulId(baulId), new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baulId), CustodioId, $"Recuerdo antiguo {i}", _clock.UtcNow().AddDays(-i - 1)));
        }

        var builder = CreateBuilder(embeddingBackend);
        var context = await builder.BuildAsync(baul, "¿Qué sabemos de la familia?");

        Assert.Contains("El más reciente", context);
    }
}
