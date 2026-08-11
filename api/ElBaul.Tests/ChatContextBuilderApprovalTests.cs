using ElBaul.Application.Chat;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;
using static VerifyXunit.Verifier;

using ElBaul.Domain;
namespace ElBaul.Tests;

/// <summary>
/// Approval tests for the full text of the prompt ChatContextBuilder hands to the AI —
/// a snapshot of the actual wording/structure, unlike ChatContextBuilderTests' targeted
/// substring assertions. Catches any unintended change (ordering, phrasing, missing section)
/// that substring checks wouldn't notice, at the cost of needing a human to review and
/// re-approve the .verified.txt file on intentional prompt changes.
/// </summary>
public class ChatContextBuilderApprovalTests
{
    private const string CustodioId = "custodio-1";
    private static readonly DateTime BaseDate = new(2024, 3, 15);

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly InMemoryRecuerdoEmbeddingRepository _recuerdoEmbeddingRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly StaticClock _clock = new();

    private ChatContextBuilder CreateBuilder(IEmbeddingBackend? embeddingBackend = null) =>
        new(_baulRepository, _chapterRepository, _recuerdoRepository, _photoRepository,
            new RelevantRecuerdoSelector(NullLogger<RelevantRecuerdoSelector>.Instance, _recuerdoEmbeddingRepository,
                embeddingBackend ?? new FakeEmbeddingBackend([]), _clock));

    [Fact]
    public async Task BuildAsync_WithChaptersPersonasAndRecuerdos()
    {
        var baulId = Guid.NewGuid();
        var baul = new Baul(new BaulId(baulId), "Viajes de la familia", "Los viajes que hicimos juntos", new UserId(CustodioId), 1, BaseDate, BaseDate);
        await _baulRepository.CreateAsync(baul);
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(CustodioId), "Papá", BaulRole.Administrador, BaseDate, Name: "Antonio"));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId("user-2"), "Mamá", BaulRole.Colaborador, BaseDate));

        var chapter = new Chapter(new ChapterId(Guid.NewGuid()), new BaulId(baulId), "Boda de Ana", 5, null, BaseDate, BaseDate);
        await _chapterRepository.CreateAsync(chapter);
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), chapter.Id, new BaulId(baulId), "key-1", PhotoDates.Of(2010, 5), new UserId(CustodioId), BaseDate));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), chapter.Id, new BaulId(baulId), "key-2", PhotoDates.Of(2010, 9), new UserId(CustodioId), BaseDate));

        _recuerdoRepository.SeedForBaul(new BaulId(baulId), new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, new ChapterId(chapter.Id), new BaulId(baulId), new UserId(CustodioId), "Fuimos a Asturias en verano", BaseDate.AddDays(-10)));
        _recuerdoRepository.SeedForBaul(new BaulId(baulId), new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baulId), new UserId("user-2"), "El abuelo cantaba en las bodas", BaseDate.AddDays(-5)));

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, "¿Cuándo fue el viaje a Asturias?");

        await Verify(context);
    }

    [Fact]
    public async Task BuildAsync_WithMinimalBaul_NoDescriptionChaptersPersonasOrRecuerdos()
    {
        var baulId = Guid.NewGuid();
        var baul = new Baul(new BaulId(baulId), "Baúl vacío", null, new UserId(CustodioId), 0, BaseDate, BaseDate);
        await _baulRepository.CreateAsync(baul);

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, "¿Qué hay en este baúl?");

        await Verify(context);
    }

    [Fact]
    public async Task BuildAsync_WithMoreRecuerdosThanTheRelevanceLimit()
    {
        var baulId = Guid.NewGuid();
        var baul = new Baul(new BaulId(baulId), "Familia", null, new UserId(CustodioId), 0, BaseDate, BaseDate);
        await _baulRepository.CreateAsync(baul);
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(CustodioId), "Custodio", BaulRole.Administrador, BaseDate));

        _recuerdoRepository.SeedForBaul(new BaulId(baulId), new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baulId), new UserId(CustodioId), "Fuimos de viaje a Asturias en verano", BaseDate));
        for (var i = 0; i < 25; i++)
        {
            _recuerdoRepository.SeedForBaul(new BaulId(baulId), new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baulId), new UserId(CustodioId), $"Recuerdo de relleno numero {i}", BaseDate.AddDays(-i - 1)));
        }

        var embeddingBackend = new FakeEmbeddingBackend(["asturias", "relleno"]);
        var builder = CreateBuilder(embeddingBackend);
        var context = await builder.BuildAsync(baul, "¿Qué sabemos del viaje a Asturias?");

        await Verify(context);
    }
}
