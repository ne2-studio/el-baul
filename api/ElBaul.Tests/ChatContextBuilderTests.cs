using CSharpFunctionalExtensions;
using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Infra.Lite;
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
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly StaticClock _clock = new();

    private ChatContextBuilder CreateBuilder(IEmbeddingBackend? embeddingBackend = null) =>
        new(NullLogger<ChatContextBuilder>.Instance, _baulRepository, _chapterRepository, _recuerdoRepository,
            _recuerdoEmbeddingRepository, _photoRepository, embeddingBackend ?? new FakeEmbeddingBackend([]), _clock);

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

    [Fact]
    public async Task BuildAsync_ShouldTagARecuerdo_WithItsPhotosDate_NotItsWriteDate()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");

        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), null, new BaulId(baulId), "key", PhotoDates.Of(1998, 6, 15), CustodioId, _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);
        var recuerdo = new Recuerdo(new RecuerdoId(Guid.NewGuid()), photo.Id, null, new BaulId(baulId), CustodioId, "Aquí sopló el abuelo las velas", _clock.UtcNow());
        _recuerdoRepository.SeedForBaul(new BaulId(baulId), recuerdo);

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, "¿Cuándo fue el cumpleaños del abuelo?");

        Assert.Contains("[1998-06-15]", context);
        Assert.DoesNotContain(_clock.UtcNow().ToString("yyyy-MM-dd"), context);
    }

    [Fact]
    public async Task BuildAsync_ShouldTagARecuerdo_WithItsChaptersEarliestPhotoDate_WhenNotDirectlyLinkedToADatedPhoto()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        var chapter = new Chapter(new ChapterId(Guid.NewGuid()), new BaulId(baulId), "Boda de Ana", 2, null, _clock.UtcNow(), _clock.UtcNow());
        await _chapterRepository.CreateAsync(chapter);

        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), chapter.Id, new BaulId(baulId), "key-1", PhotoDates.Of(2010, 9), CustodioId, _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), chapter.Id, new BaulId(baulId), "key-2", PhotoDates.Of(2010, 5), CustodioId, _clock.UtcNow()));

        var recuerdo = new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, chapter.Id, new BaulId(baulId), CustodioId, "Qué boda tan bonita", _clock.UtcNow());
        _recuerdoRepository.SeedForBaul(new BaulId(baulId), recuerdo);

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, "¿Cuándo fue la boda de Ana?");

        Assert.Contains("[2010-05]", context);
    }

    [Fact]
    public async Task BuildAsync_ShouldOmitTheDateTag_WhenNeitherThePhotoNorTheChapterHasADate()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        var recuerdo = new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baulId), CustodioId, "Un recuerdo suelto sin fecha", _clock.UtcNow());
        _recuerdoRepository.SeedForBaul(new BaulId(baulId), recuerdo);

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, "¿Qué recuerdos hay?");

        Assert.Contains("- Custodio: \"Un recuerdo suelto sin fecha\"", context);
    }
}
