using ElBaul.Application.Chat;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Shared;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class StaticSuggestedQuestionsStrategyTests
{
    private const string CustodioId = "custodio-1";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly StaticClock _clock = new();

    private StaticSuggestedQuestionsStrategy CreateStrategy() => new(_chapterRepository, _baulRepository);

    private async Task<Baul> SeedBaulAsync(Guid baulId)
    {
        var now = _clock.UtcNow();
        var baul = new Baul(new BaulId(baulId), "Familia", null, new UserId(CustodioId), 0, now, now);
        await _baulRepository.CreateAsync(baul);
        return baul;
    }

    [Fact]
    public async Task GenerateAsync_ShouldNeverFail()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId);

        var strategy = CreateStrategy();
        var result = await strategy.GenerateAsync(baul);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task GenerateAsync_ShouldAskAboutRealPersonas_AndRealChapters()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId);
        var now = _clock.UtcNow();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), new UserId(CustodioId), "Abuelo Antonio", BaulRole.Administrador, now));
        await _chapterRepository.CreateAsync(new Chapter(new ChapterId(Guid.NewGuid()), new BaulId(baulId), "Verano en Asturias", 3, null, now, now));

        var strategy = CreateStrategy();
        var result = await strategy.GenerateAsync(baul);

        Assert.True(result.IsSuccess);
        Assert.Contains("¿Qué recuerdos tenemos sobre Abuelo Antonio?", result.Value);
        Assert.Contains("¿Qué pasó durante Verano en Asturias?", result.Value);
    }

    [Fact]
    public async Task GenerateAsync_ShouldPadWithFallbackQuestions_WhenTheBaulHasNoPersonasOrChapters()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId);

        var strategy = CreateStrategy();
        var result = await strategy.GenerateAsync(baul);

        Assert.True(result.IsSuccess);
        Assert.NotEmpty(result.Value);
        Assert.All(result.Value, q => Assert.False(string.IsNullOrWhiteSpace(q)));
    }

    [Fact]
    public async Task GenerateAsync_ShouldReturnAtMostFourQuestions_EvenWithManyPersonasAndChapters()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId);
        var now = _clock.UtcNow();
        for (var i = 0; i < 5; i++)
        {
            await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), null, $"Persona {i}", BaulRole.Colaborador, now));
            await _chapterRepository.CreateAsync(new Chapter(new ChapterId(Guid.NewGuid()), new BaulId(baulId), $"Capítulo {i}", 0, null, now, now));
        }

        var strategy = CreateStrategy();
        var result = await strategy.GenerateAsync(baul);

        Assert.True(result.Value.Count() <= 4);
    }
}
