using ElBaul.Core.Chat.Application;
using ElBaul.Infra.Lite;
using ElBaul.Core.Chat.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;

using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

// NONE/ADD/UPDATE extraction outcomes, failure isolation (extraction/embedding failures never
// throw), and that everything stays scoped to the (baúl, user) the message came from. Never
// hits a real OpenAI-backed IChatMemoryExtractionBackend — see FakeChatMemoryExtractionBackend.
public class ChatMemoryExtractionManagerTests
{
    private const string CustodioId = "custodio-1";
    private static readonly BaulId BaulId = new(Guid.NewGuid());
    private static readonly UserId UserId = new(CustodioId);
    private static readonly Guid SourceMessageId = Guid.NewGuid();

    private readonly InMemoryChatMemoryRepository _chatMemoryRepository = new();
    private readonly InMemoryChatMemoryEmbeddingRepository _chatMemoryEmbeddingRepository = new();
    private readonly FakeChatMemoryExtractionBackend _extractionBackend = new();
    private readonly FakeEmbeddingBackend _embeddingBackend = new(["muebles"]);
    private readonly StaticClock _clock = new();

    private ChatMemoryExtractionManager CreateManager(IAppConfiguration? appConfiguration = null) =>
        new(NullLogger<ChatMemoryExtractionManager>.Instance, appConfiguration ?? new StaticAppConfiguration(),
            _chatMemoryRepository, _chatMemoryEmbeddingRepository, _extractionBackend, _embeddingBackend,
            new RelevantChatMemorySelector(NullLogger<RelevantChatMemorySelector>.Instance, _chatMemoryRepository,
                _chatMemoryEmbeddingRepository, _embeddingBackend, appConfiguration ?? new StaticAppConfiguration()),
            new StaticIdGenerator(Guid.NewGuid()), _clock);

    [Fact]
    public async Task ExtractFromMessageAsync_ShouldDoNothing_WhenNoOperationsAreProposed()
    {
        _extractionBackend.NextResult = Result.Success<IReadOnlyList<ChatMemoryOperation>>([]);

        var result = await CreateManager().ExtractFromMessageAsync(BaulId, UserId, SourceMessageId, "¿Puedes buscar fotos de mi abuelo?");

        Assert.True(result.IsSuccess);
        Assert.Empty(await _chatMemoryRepository.GetByBaulAndUserAsync(BaulId, UserId));
    }

    [Fact]
    public async Task ExtractFromMessageAsync_ShouldCreateAMemory_ForAnAddOperation()
    {
        _extractionBackend.NextResult = Result.Success<IReadOnlyList<ChatMemoryOperation>>(
            [new ChatMemoryOperation(ChatMemoryOperationType.Add, "El abuelo Manuel trabajó en una fábrica de muebles.", null)]);

        var result = await CreateManager().ExtractFromMessageAsync(
            BaulId, UserId, SourceMessageId, "Mi abuelo Manuel trabajó durante muchos años en una fábrica de muebles.");

        Assert.True(result.IsSuccess);
        var memory = Assert.Single(await _chatMemoryRepository.GetByBaulAndUserAsync(BaulId, UserId));
        Assert.Equal("El abuelo Manuel trabajó en una fábrica de muebles.", memory.Content);
        Assert.Equal(BaulId, memory.BaulId);
        Assert.Equal(UserId, memory.UserId);
        Assert.Equal(SourceMessageId, memory.SourceMessageId);
        Assert.NotEmpty(await _chatMemoryEmbeddingRepository.GetByBaulAndUserAsync(BaulId, UserId));
    }

    [Fact]
    public async Task ExtractFromMessageAsync_ShouldUpdateTheExistingMemory_ForAnUpdateOperation()
    {
        var existing = new ChatMemory(new ChatMemoryId(Guid.NewGuid()), BaulId, UserId, "Manuel trabajaba en una fábrica de muebles.", _clock.UtcNow(), _clock.UtcNow(), null);
        await _chatMemoryRepository.CreateAsync(existing);
        _extractionBackend.NextResult = Result.Success<IReadOnlyList<ChatMemoryOperation>>(
            [new ChatMemoryOperation(ChatMemoryOperationType.Update, "El abuelo Manuel trabajó 30 años en Muebles López.", existing.Id.ToString())]);

        var result = await CreateManager().ExtractFromMessageAsync(
            BaulId, UserId, SourceMessageId, "Mi abuelo Manuel estuvo allí treinta años. La fábrica se llamaba Muebles López.");

        Assert.True(result.IsSuccess);
        var memory = Assert.Single(await _chatMemoryRepository.GetByBaulAndUserAsync(BaulId, UserId));
        Assert.Equal(existing.Id, memory.Id);
        Assert.Equal("El abuelo Manuel trabajó 30 años en Muebles López.", memory.Content);
    }

    [Fact]
    public async Task ExtractFromMessageAsync_ShouldFallBackToAdd_WhenTheUpdateIdDoesNotBelongToThisUserOrBaul()
    {
        var foreignMemory = new ChatMemory(new ChatMemoryId(Guid.NewGuid()), new BaulId(Guid.NewGuid()), UserId, "Otro baúl", _clock.UtcNow(), _clock.UtcNow(), null);
        await _chatMemoryRepository.CreateAsync(foreignMemory);
        _extractionBackend.NextResult = Result.Success<IReadOnlyList<ChatMemoryOperation>>(
            [new ChatMemoryOperation(ChatMemoryOperationType.Update, "Un hecho nuevo", foreignMemory.Id.ToString())]);

        var result = await CreateManager().ExtractFromMessageAsync(BaulId, UserId, SourceMessageId, "mensaje");

        Assert.True(result.IsSuccess);
        var memories = (await _chatMemoryRepository.GetByBaulAndUserAsync(BaulId, UserId)).ToList();
        var created = Assert.Single(memories);
        Assert.Equal("Un hecho nuevo", created.Content);
        Assert.NotEqual(foreignMemory.Id, created.Id);
    }

    [Fact]
    public async Task ExtractFromMessageAsync_ShouldFail_WhenTheExtractionBackendFails()
    {
        _extractionBackend.NextResult = Result.Failure<IReadOnlyList<ChatMemoryOperation>>(
            ApplicationError.ExternalDependencyUnavailable("down"));

        var result = await CreateManager().ExtractFromMessageAsync(BaulId, UserId, SourceMessageId, "mensaje");

        Assert.True(result.IsFailure);
        Assert.Empty(await _chatMemoryRepository.GetByBaulAndUserAsync(BaulId, UserId));
    }

    [Fact]
    public async Task ExtractFromMessageAsync_ShouldStillCreateTheMemory_WhenEmbeddingFails()
    {
        _extractionBackend.NextResult = Result.Success<IReadOnlyList<ChatMemoryOperation>>(
            [new ChatMemoryOperation(ChatMemoryOperationType.Add, "Un hecho nuevo", null)]);
        _embeddingBackend.NextEmbedResult = Result.Failure<float[]>(ApplicationError.ExternalDependencyUnavailable("down"));

        var result = await CreateManager().ExtractFromMessageAsync(BaulId, UserId, SourceMessageId, "mensaje");

        Assert.True(result.IsSuccess);
        Assert.Single(await _chatMemoryRepository.GetByBaulAndUserAsync(BaulId, UserId));
        Assert.Empty(await _chatMemoryEmbeddingRepository.GetByBaulAndUserAsync(BaulId, UserId));
    }

    [Fact]
    public async Task ExtractFromMessageAsync_ShouldDoNothing_WhenChatMemoryIsDisabled()
    {
        var manager = CreateManager(new StaticAppConfiguration(chatMemoryEnabled: false));

        var result = await manager.ExtractFromMessageAsync(BaulId, UserId, SourceMessageId, "mensaje");

        Assert.True(result.IsSuccess);
        Assert.Empty(_extractionBackend.Calls);
    }
}
