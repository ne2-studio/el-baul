using ElBaul.Application;
using ElBaul.Ports.Output;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

namespace ElBaul.Tests;

public class ChatManagerTests
{
    private const string CustodioId = "custodio-1";
    private const string OtherUserId = "user-2";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryChapterRepository _chapterRepository = new();
    private readonly InMemoryRecuerdoRepository _recuerdoRepository = new();
    private readonly InMemoryChatMessageRepository _chatMessageRepository = new();
    private readonly InMemoryRecuerdoEmbeddingRepository _recuerdoEmbeddingRepository = new();
    private readonly FakeAiChatBackend _aiChatBackend = new();
    private readonly StaticClock _clock = new();

    private ChatManager CreateManager(
        string currentUserId, Guid? nextId = null, IEmbeddingBackend? embeddingBackend = null, IAppConfiguration? appConfiguration = null) =>
        new(NullLogger<ChatManager>.Instance, _baulRepository, _chapterRepository, _recuerdoRepository,
            _chatMessageRepository, _recuerdoEmbeddingRepository, _aiChatBackend,
            embeddingBackend ?? new FakeEmbeddingBackend([]), appConfiguration ?? new StaticAppConfiguration(),
            new StaticIdGenerator(nextId ?? Guid.NewGuid()), _clock, new StaticCurrentUserProvider(currentUserId));

    private async Task<Baul> SeedBaulAsync(Guid baulId, string name, string custodioId = CustodioId)
    {
        var now = _clock.UtcNow();
        var baul = new Baul(baulId, name, null, custodioId, 0, now, now);
        await _baulRepository.CreateAsync(baul);
        await _baulRepository.AddSharedUserAsync(new SharedUser(
            Guid.NewGuid(), baulId, custodioId, "Custodio", BaulRole.Custodio, now));
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

        var history = (await _chatMessageRepository.GetByBaulAndUserAsync(baulId, CustodioId)).ToList();
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
    public async Task SendMessageAsync_ShouldIncludeBaulRecuerdosAndChapters_InTheSystemPrompt()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Viajes de la familia");
        await _chapterRepository.CreateAsync(new Chapter(Guid.NewGuid(), baulId, "Boda de Ana", 5, null, _clock.UtcNow(), _clock.UtcNow()));
        _recuerdoRepository.SeedForBaul(baulId, new Recuerdo(
            Guid.NewGuid(), null, null, baulId, CustodioId, "Fuimos a Asturias en verano", _clock.UtcNow()));

        var manager = CreateManager(CustodioId);
        await manager.SendMessageAsync(baulId, "¿Cuándo fue el viaje a Asturias?");

        var systemPrompt = Assert.Single(_aiChatBackend.Calls).SystemPrompt;
        Assert.Contains("Boda de Ana", systemPrompt);
        Assert.Contains("Fuimos a Asturias en verano", systemPrompt);
    }

    [Fact]
    public async Task SendMessageAsync_ShouldOnlyIncludeTheMostRelevantRecuerdos_WhenThereAreManyOfThem()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var embeddingBackend = new FakeEmbeddingBackend(["asturias", "relleno"]);

        _recuerdoRepository.SeedForBaul(baulId, new Recuerdo(
            Guid.NewGuid(), null, null, baulId, CustodioId, "Fuimos de viaje a Asturias en verano", _clock.UtcNow()));
        for (var i = 0; i < 25; i++)
        {
            _recuerdoRepository.SeedForBaul(baulId, new Recuerdo(
                Guid.NewGuid(), null, null, baulId, CustodioId, $"Recuerdo de relleno numero {i}", _clock.UtcNow()));
        }

        var manager = CreateManager(CustodioId, embeddingBackend: embeddingBackend);
        await manager.SendMessageAsync(baulId, "¿Qué sabemos del viaje a Asturias?");

        var systemPrompt = Assert.Single(_aiChatBackend.Calls).SystemPrompt;
        Assert.Contains("Fuimos de viaje a Asturias en verano", systemPrompt);
        Assert.Contains("recuerdos en total en el baúl", systemPrompt);

        var includedFillerCount = Enumerable.Range(0, 25)
            .Count(i => systemPrompt.Contains($"Recuerdo de relleno numero {i}"));
        Assert.True(includedFillerCount < 25, "Some filler recuerdos should have been left out of the prompt");
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
        var history = (await _chatMessageRepository.GetByBaulAndUserAsync(baulId, CustodioId)).ToList();
        Assert.Single(history);
    }

    [Fact]
    public async Task GetMessagesAsync_ShouldDenyAccess_WhenUserHasNoRelationToBaul()
    {
        var baulId = Guid.NewGuid();
        await SeedBaulAsync(baulId, "Familia");
        var manager = CreateManager(OtherUserId);

        var result = await manager.GetMessagesAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Access denied", result.Error);
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
}
