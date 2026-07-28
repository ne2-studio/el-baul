using ElBaul.Application;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace ElBaul.Tests;

// Orchestration only — access checks, message persistence, prompt composition, AI-backend
// failure handling, and delegating to whichever ISuggestedQuestionsStrategy is configured.
// Prompt-building/RAG-ranking behavior lives in ChatContextBuilder and is tested in isolation
// there; the strategies themselves are tested in isolation in
// StaticSuggestedQuestionsStrategyTests/AiSuggestedQuestionsStrategyTests — here both
// IChatContextBuilder and ISuggestedQuestionsStrategy are stubbed so these tests don't need to
// know anything about recuerdos, chapters, embeddings or question-generation strategy.
public class ChatManagerTests
{
    private const string CustodioId = "custodio-1";
    private const string OtherUserId = "user-2";
    private const string StubbedContext = "contexto de prueba";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryChatMessageRepository _chatMessageRepository = new();
    private readonly FakeAiChatBackend _aiChatBackend = new();
    private readonly StaticClock _clock = new();
    private readonly IChatContextBuilder _chatContextBuilder = Substitute.For<IChatContextBuilder>();
    private readonly ISuggestedQuestionsStrategy _suggestedQuestionsStrategy = Substitute.For<ISuggestedQuestionsStrategy>();

    public ChatManagerTests()
    {
        _chatContextBuilder.BuildAsync(Arg.Any<Baul>(), Arg.Any<string>()).Returns(StubbedContext);
        _suggestedQuestionsStrategy.GenerateAsync(Arg.Any<Baul>())
            .Returns(Result.Success<IEnumerable<string>>(["¿Pregunta de prueba?"]));
    }

    private ChatManager CreateManager(
        string currentUserId, Guid? nextId = null, IAppConfiguration? appConfiguration = null) =>
        new(NullLogger<ChatManager>.Instance, _baulRepository, _chatMessageRepository, _aiChatBackend,
            appConfiguration ?? new StaticAppConfiguration(), new StaticIdGenerator(nextId ?? Guid.NewGuid()),
            _clock, new StaticCurrentUserProvider(currentUserId), new BaulAccessService(_baulRepository, NullLogger<BaulAccessService>.Instance),
            _chatContextBuilder, _suggestedQuestionsStrategy);

    private async Task<Baul> SeedBaulAsync(Guid baulId, string name, string custodioId = CustodioId)
    {
        var now = _clock.UtcNow();
        var baul = new Baul(new BaulId(baulId), name, null, custodioId, 0, now, now);
        await _baulRepository.CreateAsync(baul);
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), new BaulId(baulId), custodioId, "Custodio", BaulRole.Custodio, now));
        return baul;
    }

    [Fact]
    public async Task SendMessageAsync_ShouldFail_WhenChatIsDisabled()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var manager = CreateManager(CustodioId, appConfiguration: new StaticAppConfiguration(chatEnabled: false));

        var result = await manager.SendMessageAsync(new BaulId(baulId), "Hola");

        Assert.True(result.IsFailure);
        Assert.Equal("Chat is not enabled", result.Error.Message);
        Assert.Empty(_aiChatBackend.Calls);
    }

    [Fact]
    public async Task GetMessagesAsync_ShouldFail_WhenChatIsDisabled()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var manager = CreateManager(CustodioId, appConfiguration: new StaticAppConfiguration(chatEnabled: false));

        var result = await manager.GetMessagesAsync(new BaulId(baulId));

        Assert.True(result.IsFailure);
        Assert.Equal("Chat is not enabled", result.Error.Message);
    }

    [Fact]
    public async Task SendMessageAsync_ShouldFail_WhenBaulDoesNotExist()
    {
        var manager = CreateManager(CustodioId);

        var result = await manager.SendMessageAsync(new BaulId(Guid.NewGuid()), "¿Qué sabemos del abuelo?");

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error.Message);
    }

    [Fact]
    public async Task SendMessageAsync_ShouldDenyAccess_WhenUserHasNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var manager = CreateManager(OtherUserId);

        var result = await manager.SendMessageAsync(new BaulId(baulId), "Hola");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
        Assert.Empty(_aiChatBackend.Calls);
    }

    [Fact]
    public async Task SendMessageAsync_ShouldPersistUserAndAssistantMessages_AndReturnTheReply()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        _aiChatBackend.NextResult = "El abuelo Antonio nació en Asturias.";

        var manager = CreateManager(CustodioId);
        var result = await manager.SendMessageAsync(new BaulId(baulId), "¿Qué sabemos del abuelo Antonio?");

        Assert.True(result.IsSuccess);
        Assert.Equal("assistant", result.Value.Role);
        Assert.Equal("El abuelo Antonio nació en Asturias.", result.Value.Content);

        var history = (await _chatMessageRepository.GetByBaulAndUserAsync(new BaulId(baulId), CustodioId)).ToList();
        Assert.Equal(2, history.Count);
        Assert.Equal(ChatMessageRole.User, history[0].Role);
        Assert.Equal("¿Qué sabemos del abuelo Antonio?", history[0].Content);
        Assert.Equal(ChatMessageRole.Assistant, history[1].Role);
    }

    [Fact]
    public async Task SendMessageAsync_ShouldPersistAssistantMessages_LongerThanTheOldRecuerdoLengthLimit()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var longReply = new string('a', 6000);
        _aiChatBackend.NextResult = longReply;

        var manager = CreateManager(CustodioId);
        var result = await manager.SendMessageAsync(new BaulId(baulId), "Cuéntame mucho sobre la familia");

        Assert.True(result.IsSuccess);
        Assert.Equal(longReply, result.Value.Content);
    }

    [Fact]
    public async Task SendMessageAsync_ShouldBuildTheSystemPrompt_FromTheBaulAndTheContextBuilder()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");

        var manager = CreateManager(CustodioId);
        await manager.SendMessageAsync(new BaulId(baulId), "¿Qué sabemos del viaje a Asturias?");

        await _chatContextBuilder.Received(1).BuildAsync(baul, "¿Qué sabemos del viaje a Asturias?");
        var systemPrompt = Assert.Single(_aiChatBackend.Calls).SystemPrompt;
        Assert.Contains(StubbedContext, systemPrompt);
    }

    [Fact]
    public async Task SendMessageAsync_ShouldFail_WhenTheAiBackendFails()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        _aiChatBackend.NextResult = CSharpFunctionalExtensions.Result.Failure<string>("Chat is not configured.");

        var manager = CreateManager(CustodioId);
        var result = await manager.SendMessageAsync(new BaulId(baulId), "Hola");

        Assert.True(result.IsFailure);
        Assert.Equal("Chat is not configured.", result.Error.Message);

        // The user's message is still saved even though the reply failed — nothing is lost.
        var history = (await _chatMessageRepository.GetByBaulAndUserAsync(new BaulId(baulId), CustodioId)).ToList();
        Assert.Single(history);
    }

    [Fact]
    public async Task GetMessagesAsync_ShouldReturnHistory_OldestFirst()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var manager = CreateManager(CustodioId);
        await manager.SendMessageAsync(new BaulId(baulId), "Primera pregunta");
        await manager.SendMessageAsync(new BaulId(baulId), "Segunda pregunta");

        var result = await manager.GetMessagesAsync(new BaulId(baulId));

        Assert.True(result.IsSuccess);
        var messages = result.Value.ToList();
        Assert.Equal(4, messages.Count);
        Assert.Equal("Primera pregunta", messages[0].Content);
        Assert.Equal("Segunda pregunta", messages[2].Content);
    }

    [Fact]
    public async Task GetSuggestedQuestionsAsync_ShouldFail_WhenChatIsDisabled()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var manager = CreateManager(CustodioId, appConfiguration: new StaticAppConfiguration(chatEnabled: false));

        var result = await manager.GetSuggestedQuestionsAsync(new BaulId(baulId));

        Assert.True(result.IsFailure);
        Assert.Equal("Chat is not enabled", result.Error.Message);
        await _suggestedQuestionsStrategy.DidNotReceive().GenerateAsync(Arg.Any<Baul>());
    }

    [Fact]
    public async Task GetSuggestedQuestionsAsync_ShouldFail_WhenBaulDoesNotExist()
    {
        var manager = CreateManager(CustodioId);

        var result = await manager.GetSuggestedQuestionsAsync(new BaulId(Guid.NewGuid()));

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error.Message);
    }

    [Fact]
    public async Task GetSuggestedQuestionsAsync_ShouldDenyAccess_WhenUserHasNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var manager = CreateManager(OtherUserId);

        var result = await manager.GetSuggestedQuestionsAsync(new BaulId(baulId));

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error.Message);
        await _suggestedQuestionsStrategy.DidNotReceive().GenerateAsync(Arg.Any<Baul>());
    }

    [Fact]
    public async Task GetSuggestedQuestionsAsync_ShouldReturnWhatTheConfiguredStrategyGenerates()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        _suggestedQuestionsStrategy.GenerateAsync(baul)
            .Returns(Result.Success<IEnumerable<string>>(["¿Qué pasó durante la boda de Ana?"]));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetSuggestedQuestionsAsync(new BaulId(baulId));

        Assert.True(result.IsSuccess);
        Assert.Equal(["¿Qué pasó durante la boda de Ana?"], result.Value);
        await _suggestedQuestionsStrategy.Received(1).GenerateAsync(baul);
    }

    [Fact]
    public async Task GetSuggestedQuestionsAsync_ShouldFail_WhenTheStrategyFails()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");
        _suggestedQuestionsStrategy.GenerateAsync(baul)
            .Returns(Result.Failure<IEnumerable<string>>(
                ApplicationError.ExternalDependencyUnavailable("Chat is not configured.")));

        var manager = CreateManager(CustodioId);
        var result = await manager.GetSuggestedQuestionsAsync(new BaulId(baulId));

        Assert.True(result.IsFailure);
        Assert.Equal("Chat is not configured.", result.Error.Message);
    }
}
