using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace ElBaul.Tests;

// Orchestration only — access checks, message persistence, prompt composition, AI-backend
// failure handling. Prompt-building/RAG-ranking behavior lives in ChatContextBuilder and is
// tested in isolation there; here IChatContextBuilder is stubbed so these tests don't need to
// know anything about recuerdos, chapters or embeddings.
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

    public ChatManagerTests()
    {
        _chatContextBuilder.BuildAsync(Arg.Any<Baul>(), Arg.Any<string>()).Returns(StubbedContext);
        _chatContextBuilder.BuildSummaryAsync(Arg.Any<Baul>()).Returns(StubbedContext);
    }

    private ChatManager CreateManager(
        string currentUserId, Guid? nextId = null, IAppConfiguration? appConfiguration = null) =>
        new(NullLogger<ChatManager>.Instance, _baulRepository, _chatMessageRepository, _aiChatBackend,
            appConfiguration ?? new StaticAppConfiguration(), new StaticIdGenerator(nextId ?? Guid.NewGuid()),
            _clock, new StaticCurrentUserProvider(currentUserId), new BaulAccessService(_baulRepository, NullLogger<BaulAccessService>.Instance),
            _chatContextBuilder);

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

        var result = await manager.SendMessageAsync(baulId, "Hola");

        Assert.True(result.IsFailure);
        Assert.Equal("Chat is not enabled", result.Error);
        Assert.Empty(_aiChatBackend.Calls);
    }

    [Fact]
    public async Task GetMessagesAsync_ShouldFail_WhenChatIsDisabled()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var manager = CreateManager(CustodioId, appConfiguration: new StaticAppConfiguration(chatEnabled: false));

        var result = await manager.GetMessagesAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Chat is not enabled", result.Error);
    }

    [Fact]
    public async Task SendMessageAsync_ShouldFail_WhenBaulDoesNotExist()
    {
        var manager = CreateManager(CustodioId);

        var result = await manager.SendMessageAsync(Guid.NewGuid(), "¿Qué sabemos del abuelo?");

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error);
    }

    [Fact]
    public async Task SendMessageAsync_ShouldDenyAccess_WhenUserHasNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var manager = CreateManager(OtherUserId);

        var result = await manager.SendMessageAsync(baulId, "Hola");

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
        Assert.Empty(_aiChatBackend.Calls);
    }

    [Fact]
    public async Task SendMessageAsync_ShouldPersistUserAndAssistantMessages_AndReturnTheReply()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        _aiChatBackend.NextResult = "El abuelo Antonio nació en Asturias.";

        var manager = CreateManager(CustodioId);
        var result = await manager.SendMessageAsync(baulId, "¿Qué sabemos del abuelo Antonio?");

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
        var result = await manager.SendMessageAsync(baulId, "Cuéntame mucho sobre la familia");

        Assert.True(result.IsSuccess);
        Assert.Equal(longReply, result.Value.Content);
    }

    [Fact]
    public async Task SendMessageAsync_ShouldBuildTheSystemPrompt_FromTheBaulAndTheContextBuilder()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");

        var manager = CreateManager(CustodioId);
        await manager.SendMessageAsync(baulId, "¿Qué sabemos del viaje a Asturias?");

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
        var result = await manager.SendMessageAsync(baulId, "Hola");

        Assert.True(result.IsFailure);
        Assert.Equal("Chat is not configured.", result.Error);

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
        await manager.SendMessageAsync(baulId, "Primera pregunta");
        await manager.SendMessageAsync(baulId, "Segunda pregunta");

        var result = await manager.GetMessagesAsync(baulId);

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

        var result = await manager.GetSuggestedQuestionsAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Chat is not enabled", result.Error);
        Assert.Empty(_aiChatBackend.Calls);
    }

    [Fact]
    public async Task GetSuggestedQuestionsAsync_ShouldFail_WhenBaulDoesNotExist()
    {
        var manager = CreateManager(CustodioId);

        var result = await manager.GetSuggestedQuestionsAsync(Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("Baul not found", result.Error);
    }

    [Fact]
    public async Task GetSuggestedQuestionsAsync_ShouldDenyAccess_WhenUserHasNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var manager = CreateManager(OtherUserId);

        var result = await manager.GetSuggestedQuestionsAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
        Assert.Empty(_aiChatBackend.Calls);
    }

    [Fact]
    public async Task GetSuggestedQuestionsAsync_ShouldReturnOneQuestionPerLine_FromTheAiReply()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        _aiChatBackend.NextResult = "- ¿Qué sabemos del abuelo Antonio?\n- ¿Cuándo fue la boda de Ana?\n\n- Ayúdame a escribir un recuerdo.";

        var manager = CreateManager(CustodioId);
        var result = await manager.GetSuggestedQuestionsAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Equal(
            ["¿Qué sabemos del abuelo Antonio?", "¿Cuándo fue la boda de Ana?", "Ayúdame a escribir un recuerdo."],
            result.Value);
    }

    [Fact]
    public async Task GetSuggestedQuestionsAsync_ShouldBuildThePrompt_FromTheBaulSummary()
    {
        var baulId = Guid.NewGuid();
        var baul = await SeedBaulAsync(baulId, "Familia");

        var manager = CreateManager(CustodioId);
        await manager.GetSuggestedQuestionsAsync(baulId);

        await _chatContextBuilder.Received(1).BuildSummaryAsync(baul);
        var systemPrompt = Assert.Single(_aiChatBackend.Calls).SystemPrompt;
        Assert.Contains(StubbedContext, systemPrompt);
    }

    [Fact]
    public async Task GetSuggestedQuestionsAsync_ShouldFail_WhenTheAiBackendFails()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        _aiChatBackend.NextResult = CSharpFunctionalExtensions.Result.Failure<string>("Chat is not configured.");

        var manager = CreateManager(CustodioId);
        var result = await manager.GetSuggestedQuestionsAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Chat is not configured.", result.Error);
    }
}
