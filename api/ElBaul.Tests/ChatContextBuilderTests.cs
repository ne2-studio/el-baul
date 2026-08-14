using ElBaul.Application.Chat;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Chat;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;

using ElBaul.Domain;
namespace ElBaul.Tests;

// Prompt assembly behavior in isolation from ChatManager's orchestration — see
// RelevantRecuerdoSelectorTests/RelevantChatMemorySelectorTests for RAG ranking and
// ChatContextBuilderApprovalTests for full-text snapshots of the prompt this builds.
public class ChatContextBuilderTests
{
    private const string CustodioId = "custodio-1";
    private static readonly UserId CurrentUserId = new(CustodioId);

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly InMemoryPhotoRepository _photoRepository = new();
    private readonly StaticClock _clock = new();
    private readonly FakeRelevantRecuerdoSelector _relevantRecuerdoSelector = new();
    private readonly FakeRelevantChatMemorySelector _relevantChatMemorySelector = new();
    private readonly StaticAppConfiguration _appConfiguration = new();

    private ChatContextBuilder CreateBuilder() =>
        new(_baulRepository, _chapterRepository, _recuerdoRepository, _photoRepository,
            _relevantRecuerdoSelector, _relevantChatMemorySelector, _appConfiguration);

    private async Task<Baul> SeedBaulAsync(Guid baulId, string name)
    {
        var now = _clock.UtcNow();
        var baul = new Baul(new BaulId(baulId), name, null, new UserId(CustodioId), 0, now, now);
        await _baulRepository.CreateAsync(baul);
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(CustodioId), "Custodio", BaulRole.Administrador, now));
        return baul;
    }

    [Fact]
    public async Task BuildAsync_ShouldIncludeAllRecuerdos_WhenAtOrBelowTheLimit()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        _recuerdoRepository.SeedForBaul(new BaulId(baulId), new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baulId), new UserId(CustodioId), "Fuimos a Asturias en verano", _clock.UtcNow()));

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, CurrentUserId, "¿Cuándo fue el viaje a Asturias?");

        Assert.Contains("Fuimos a Asturias en verano", context);
        Assert.Contains("Recuerdos (ordenados del más antiguo al más reciente):", context);
    }

    [Fact]
    public async Task BuildAsync_ShouldOnlyFormatTheRecuerdos_SelectedForTheQuery()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");

        var selected = new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baulId), new UserId(CustodioId), "Fuimos de viaje a Asturias en verano", _clock.UtcNow());
        _recuerdoRepository.SeedForBaul(new BaulId(baulId), selected);
        for (var i = 0; i < 25; i++)
        {
            _recuerdoRepository.SeedForBaul(new BaulId(baulId), new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baulId), new UserId(CustodioId), $"Recuerdo de relleno numero {i}", _clock.UtcNow()));
        }
        _relevantRecuerdoSelector.NextResult = [selected];

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, CurrentUserId, "¿Qué sabemos del viaje a Asturias?");

        Assert.Contains("Fuimos de viaje a Asturias en verano", context);
        Assert.Contains("recuerdos en total en el baúl", context);
        Assert.DoesNotContain("Recuerdo de relleno numero 0", context);
    }

    [Fact]
    public async Task BuildAsync_ShouldTagARecuerdo_WithItsPhotosDate_NotItsWriteDate()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");

        var photo = Photo.Create(new PhotoId(Guid.NewGuid()), null, new BaulId(baulId), "key", PhotoDates.Of(1998, 6, 15), new UserId(CustodioId), _clock.UtcNow());
        await _photoRepository.CreateAsync(photo);
        var recuerdo = new Recuerdo(new RecuerdoId(Guid.NewGuid()), photo.Id, null, new BaulId(baulId), new UserId(CustodioId), "Aquí sopló el abuelo las velas", _clock.UtcNow());
        _recuerdoRepository.SeedForBaul(new BaulId(baulId), recuerdo);

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, CurrentUserId, "¿Cuándo fue el cumpleaños del abuelo?");

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

        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), chapter.Id, new BaulId(baulId), "key-1", PhotoDates.Of(2010, 9), new UserId(CustodioId), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), chapter.Id, new BaulId(baulId), "key-2", PhotoDates.Of(2010, 5), new UserId(CustodioId), _clock.UtcNow()));

        var recuerdo = new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, chapter.Id, new BaulId(baulId), new UserId(CustodioId), "Qué boda tan bonita", _clock.UtcNow());
        _recuerdoRepository.SeedForBaul(new BaulId(baulId), recuerdo);

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, CurrentUserId, "¿Cuándo fue la boda de Ana?");

        Assert.Contains("[2010-05]", context);
    }

    [Fact]
    public async Task BuildAsync_ShouldIncludeTheChaptersDateRange_InTheHeader()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        var chapter = new Chapter(new ChapterId(Guid.NewGuid()), new BaulId(baulId), "Boda de Ana", 2, null, _clock.UtcNow(), _clock.UtcNow());
        await _chapterRepository.CreateAsync(chapter);

        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), chapter.Id, new BaulId(baulId), "key-1", PhotoDates.Of(2010, 9), new UserId(CustodioId), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), chapter.Id, new BaulId(baulId), "key-2", PhotoDates.Of(2010, 5), new UserId(CustodioId), _clock.UtcNow()));

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, CurrentUserId, "¿Cuándo fue la boda de Ana?");

        Assert.Contains("- Boda de Ana (2 fotos, 2010-05 a 2010-09)", context);
    }

    [Fact]
    public async Task BuildAsync_ShouldResolveEachChaptersDateRange_FromItsOwnPhotos()
    {
        // Targets the batched IPhotoRepository.GetActiveByBaulIdAsync + GroupBy that replaced
        // one GetByChapterIdAsync call per chapter — two chapters with different photo dates
        // must each show their own range, the exact mistake a broken group-by would produce.
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        var firstChapter = new Chapter(new ChapterId(Guid.NewGuid()), new BaulId(baulId), "Capítulo antiguo", 1, null, _clock.UtcNow(), _clock.UtcNow());
        var secondChapter = new Chapter(new ChapterId(Guid.NewGuid()), new BaulId(baulId), "Capítulo reciente", 1, null, _clock.UtcNow(), _clock.UtcNow());
        await _chapterRepository.CreateAsync(firstChapter);
        await _chapterRepository.CreateAsync(secondChapter);

        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), firstChapter.Id, new BaulId(baulId), "key-old", PhotoDates.Of(2005, 1), new UserId(CustodioId), _clock.UtcNow()));
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), secondChapter.Id, new BaulId(baulId), "key-new", PhotoDates.Of(2022, 6), new UserId(CustodioId), _clock.UtcNow()));

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, CurrentUserId, "¿Qué capítulos hay?");

        Assert.Contains("- Capítulo antiguo (1 fotos, 2005-01)", context);
        Assert.Contains("- Capítulo reciente (1 fotos, 2022-06)", context);
    }

    [Fact]
    public async Task BuildAsync_ShouldShowASingleDate_InTheChapterHeader_WhenAllItsPhotosAgree()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        var chapter = new Chapter(new ChapterId(Guid.NewGuid()), new BaulId(baulId), "Cumple de Marta", 1, null, _clock.UtcNow(), _clock.UtcNow());
        await _chapterRepository.CreateAsync(chapter);
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), chapter.Id, new BaulId(baulId), "key-1", PhotoDates.Of(2015, 3, 20), new UserId(CustodioId), _clock.UtcNow()));

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, CurrentUserId, "¿Cuándo fue el cumple de Marta?");

        Assert.Contains("- Cumple de Marta (1 fotos, 2015-03-20)", context);
    }

    [Fact]
    public async Task BuildAsync_ShouldOmitTheDateRange_InTheChapterHeader_WhenNoneOfItsPhotosAreDated()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        var chapter = new Chapter(new ChapterId(Guid.NewGuid()), new BaulId(baulId), "Sin fecha", 0, null, _clock.UtcNow(), _clock.UtcNow());
        await _chapterRepository.CreateAsync(chapter);

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, CurrentUserId, "¿Qué capítulos hay?");

        Assert.Contains("- Sin fecha (0 fotos)", context);
    }

    [Fact]
    public async Task BuildSummaryAsync_ShouldIncludeTheChaptersDateRange()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        var chapter = new Chapter(new ChapterId(Guid.NewGuid()), new BaulId(baulId), "Boda de Ana", 1, null, _clock.UtcNow(), _clock.UtcNow());
        await _chapterRepository.CreateAsync(chapter);
        await _photoRepository.CreateAsync(Photo.Create(new PhotoId(Guid.NewGuid()), chapter.Id, new BaulId(baulId), "key-1", PhotoDates.Of(2010, 5), new UserId(CustodioId), _clock.UtcNow()));

        var builder = CreateBuilder();
        var summary = await builder.BuildSummaryAsync(baul);

        Assert.Contains("- Boda de Ana (1 fotos, 2010-05)", summary);
    }

    [Fact]
    public async Task BuildAsync_ShouldOmitTheDateTag_WhenNeitherThePhotoNorTheChapterHasADate()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        var recuerdo = new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baulId), new UserId(CustodioId), "Un recuerdo suelto sin fecha", _clock.UtcNow());
        _recuerdoRepository.SeedForBaul(new BaulId(baulId), recuerdo);

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, CurrentUserId, "¿Qué recuerdos hay?");

        Assert.Contains("- Custodio: \"Un recuerdo suelto sin fecha\"", context);
    }

    [Fact]
    public async Task BuildAsync_ShouldIncludeAPersonasBiografia_WhenSet()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), null, "Abuelo Antonio", BaulRole.Colaborador, _clock.UtcNow(), Biografia: "Nació en Asturias en 1945."));

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, CurrentUserId, "¿Qué sabemos del abuelo?");

        Assert.Contains("Biografía: Nació en Asturias en 1945.", context);
    }

    [Fact]
    public async Task BuildSummaryAsync_ShouldIncludePersonasAndChapters_ButNotRecuerdos()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        var chapter = new Chapter(new ChapterId(Guid.NewGuid()), new BaulId(baulId), "Boda de Ana", 5, null, _clock.UtcNow(), _clock.UtcNow());
        await _chapterRepository.CreateAsync(chapter);
        _recuerdoRepository.SeedForBaul(new BaulId(baulId), new Recuerdo(new RecuerdoId(Guid.NewGuid()), null, null, new BaulId(baulId), new UserId(CustodioId), "Un recuerdo que no debería aparecer", _clock.UtcNow()));

        var builder = CreateBuilder();
        var summary = await builder.BuildSummaryAsync(baul);

        Assert.Contains("Nombre del baúl: Familia", summary);
        Assert.Contains("- Custodio", summary);
        Assert.Contains("- Boda de Ana (5 fotos)", summary);
        Assert.DoesNotContain("Un recuerdo que no debería aparecer", summary);
        Assert.DoesNotContain("Recuerdos", summary);
    }

    [Fact]
    public async Task BuildAsync_ShouldIncludeRelevantMemories_WhenChatMemoryIsEnabled()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        _relevantChatMemorySelector.NextResult =
            [new ChatMemory(new ChatMemoryId(Guid.NewGuid()), new BaulId(baulId), CurrentUserId, "El abuelo Manuel trabajó en Muebles López.", _clock.UtcNow(), _clock.UtcNow(), null)];

        var builder = CreateBuilder();
        var context = await builder.BuildAsync(baul, CurrentUserId, "¿Dónde trabajó el abuelo?");

        Assert.Contains("El abuelo Manuel trabajó en Muebles López.", context);
    }

    [Fact]
    public async Task BuildAsync_ShouldOmitMemories_WhenChatMemoryIsDisabled()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        _relevantChatMemorySelector.NextResult =
            [new ChatMemory(new ChatMemoryId(Guid.NewGuid()), new BaulId(baulId), CurrentUserId, "El abuelo Manuel trabajó en Muebles López.", _clock.UtcNow(), _clock.UtcNow(), null)];

        var builder = new ChatContextBuilder(
            _baulRepository, _chapterRepository, _recuerdoRepository, _photoRepository,
            _relevantRecuerdoSelector, _relevantChatMemorySelector, new StaticAppConfiguration(chatMemoryEnabled: false));
        var context = await builder.BuildAsync(baul, CurrentUserId, "¿Dónde trabajó el abuelo?");

        Assert.DoesNotContain("Muebles López", context);
    }

    private class FakeRelevantRecuerdoSelector : IRelevantRecuerdoSelector
    {
        public List<Recuerdo>? NextResult { get; set; }

        public Task<List<Recuerdo>> SelectAsync(BaulId baulId, List<Recuerdo> recuerdos, string query) =>
            Task.FromResult(NextResult ?? recuerdos);
    }

    private class FakeRelevantChatMemorySelector : IRelevantChatMemorySelector
    {
        public List<ChatMemory>? NextResult { get; set; }

        public Task<List<ChatMemory>> SelectAsync(BaulId baulId, UserId userId, string query) =>
            Task.FromResult(NextResult ?? []);
    }
}
