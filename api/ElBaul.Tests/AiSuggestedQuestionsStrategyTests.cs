using ElBaul.Application.Chat;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Shared;
using Ne2Studio.Common;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using NSubstitute;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

public class AiSuggestedQuestionsStrategyTests
{
    private const string CustodioId = "custodio-1";
    private const string StubbedContext = "contexto de prueba";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly FakeAiChatBackend _aiChatBackend = new();
    private readonly IChatContextBuilder _chatContextBuilder = Substitute.For<IChatContextBuilder>();
    private readonly StaticClock _clock = new();

    public AiSuggestedQuestionsStrategyTests()
    {
        _chatContextBuilder.BuildSummaryAsync(Arg.Any<Baul>()).Returns(StubbedContext);
    }

    private AiSuggestedQuestionsStrategy CreateStrategy() =>
        new(NullLogger<AiSuggestedQuestionsStrategy>.Instance, _chatContextBuilder, _aiChatBackend);

    private async Task<Baul> SeedBaulAsync(Guid baulId)
    {
        var now = _clock.UtcNow();
        var baul = new Baul(new BaulId(baulId), "Familia", null, CustodioId, 0, now, now);
        await _baulRepository.CreateAsync(baul);
        return baul;
    }

    [Fact]
    public async Task GenerateAsync_ShouldReturnOneQuestionPerLine_StrippingListMarkers()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId);
        _aiChatBackend.NextResult =
            "- ¿Qué sabemos del abuelo Antonio?\n- ¿Cuándo fue la boda de Ana?\n\n- Ayúdame a escribir un recuerdo.";

        var strategy = CreateStrategy();
        var result = await strategy.GenerateAsync(baul);

        Assert.True(result.IsSuccess);
        Assert.Equal(
            ["¿Qué sabemos del abuelo Antonio?", "¿Cuándo fue la boda de Ana?", "Ayúdame a escribir un recuerdo."],
            result.Value);
    }

    [Fact]
    public async Task GenerateAsync_ShouldBuildThePrompt_FromTheBaulSummary()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId);

        var strategy = CreateStrategy();
        await strategy.GenerateAsync(baul);

        await _chatContextBuilder.Received(1).BuildSummaryAsync(baul);
        var systemPrompt = Assert.Single(_aiChatBackend.Calls).SystemPrompt;
        Assert.Contains(StubbedContext, systemPrompt);
    }

    [Fact]
    public async Task GenerateAsync_ShouldFail_WhenTheAiBackendFails()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId);
        _aiChatBackend.NextResult = Result.Failure<string>(ApplicationError.ExternalDependencyUnavailable("Chat is not configured."));

        var strategy = CreateStrategy();
        var result = await strategy.GenerateAsync(baul);

        Assert.True(result.IsFailure);
        Assert.Equal("Chat is not configured.", result.Error.Message);
    }
}
