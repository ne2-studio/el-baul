using ElBaul.Core.Bauls.Application;
using ElBaul.Core.Chat.Application;
using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chat.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;

using ElBaul.Infra.Lite;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;

using ElBaul.Domain;
namespace ElBaul.Tests;

// Scoping (User + Baúl), ownership, and the update/regenerate-embedding + delete/remove-from-
// retrieval flows. Extraction (ADD/UPDATE from a chat message) is tested separately in
// ChatMemoryExtractionManagerTests.
public class ChatMemoryManagerTests
{
    private const string CustodioId = "custodio-1";
    private const string OtherUserId = "user-2";

    private readonly InMemoryBaulRepository _baulRepository = new();
    private readonly InMemoryChatMemoryRepository _chatMemoryRepository = new();
    private readonly InMemoryChatMemoryEmbeddingRepository _chatMemoryEmbeddingRepository = new();
    private readonly FakeEmbeddingBackend _embeddingBackend = new(["muebles", "abuelo"]);
    private readonly StaticClock _clock = new();

    private ChatMemoryManager CreateManager(string currentUserId, IAppConfiguration? appConfiguration = null) =>
        new(NullLogger<ChatMemoryManager>.Instance, _chatMemoryRepository, _chatMemoryEmbeddingRepository,
            _embeddingBackend, appConfiguration ?? new StaticAppConfiguration(), _clock,
            new StaticCurrentUserProvider(currentUserId), new BaulAccessService(_baulRepository, NullLogger<BaulAccessService>.Instance),
            new FakeUnitOfWork());

    private async Task<BaulId> SeedBaulAsync(string custodioId = CustodioId)
    {
        var baulId = new BaulId(Guid.NewGuid());
        var now = _clock.UtcNow();
        await _baulRepository.CreateAsync(new Baul(baulId, "Familia", null, new UserId(custodioId), 0, now, now));
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId(custodioId), "Custodio", BaulRole.Administrador, now));
        return baulId;
    }

    private async Task<ChatMemory> SeedMemoryAsync(BaulId baulId, UserId userId, string content = "El abuelo Manuel trabajaba en una fábrica de muebles.")
    {
        var now = _clock.UtcNow();
        var memory = new ChatMemory(new ChatMemoryId(Guid.NewGuid()), baulId, userId, content, now, now, Guid.NewGuid());
        await _chatMemoryRepository.CreateAsync(memory);
        await _chatMemoryEmbeddingRepository.UpsertAsync(new ChatMemoryEmbedding(memory.Id, baulId, userId, [1f, 0f], _embeddingBackend.ModelId, now));
        return memory;
    }

    // --- Scoping -------------------------------------------------------------------------

    [Fact]
    public async Task GetMemoriesAsync_ShouldOnlyReturn_TheCurrentUsersOwnMemories()
    {
        var baulId = await SeedBaulAsync();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId(OtherUserId), "Otro", BaulRole.Colaborador, _clock.UtcNow()));
        var mine = await SeedMemoryAsync(baulId, new UserId(CustodioId), "Mi memoria");
        await SeedMemoryAsync(baulId, new UserId(OtherUserId), "Memoria ajena");

        var result = await CreateManager(CustodioId).GetMemoriesAsync(baulId);

        Assert.True(result.IsSuccess);
        var memory = Assert.Single(result.Value);
        Assert.Equal(mine.Id.ToString(), memory.Id);
    }

    [Fact]
    public async Task GetMemoriesAsync_ShouldNotReturnMemories_FromAnotherBaul()
    {
        var baulId = await SeedBaulAsync();
        var otherBaulId = await SeedBaulAsync();
        await SeedMemoryAsync(otherBaulId, new UserId(CustodioId), "Memoria de otro baúl");

        var result = await CreateManager(CustodioId).GetMemoriesAsync(baulId);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value);
    }

    [Fact]
    public async Task UpdateMemoryAsync_ShouldFail_WhenCalledByAnotherUser()
    {
        var baulId = await SeedBaulAsync();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId(OtherUserId), "Otro", BaulRole.Colaborador, _clock.UtcNow()));
        var memory = await SeedMemoryAsync(baulId, new UserId(CustodioId));

        var result = await CreateManager(OtherUserId).UpdateMemoryAsync(memory.Id, "Contenido modificado");

        Assert.True(result.IsFailure);
        Assert.Equal("Only the owner can access this memory", result.Error.Message);
    }

    [Fact]
    public async Task DeleteMemoryAsync_ShouldFail_WhenCalledByAnotherUser()
    {
        var baulId = await SeedBaulAsync();
        await _baulRepository.AddPersonaAsync(new Persona(new PersonaId(Guid.NewGuid()), baulId, new UserId(OtherUserId), "Otro", BaulRole.Colaborador, _clock.UtcNow()));
        var memory = await SeedMemoryAsync(baulId, new UserId(CustodioId));

        var result = await CreateManager(OtherUserId).DeleteMemoryAsync(memory.Id);

        Assert.True(result.IsFailure);
        Assert.Equal("Only the owner can access this memory", result.Error.Message);
        Assert.NotNull(await _chatMemoryRepository.GetByIdAsync(memory.Id));
    }

    [Fact]
    public async Task UpdateMemoryAsync_ShouldFail_WhenTheMemoryDoesNotExist()
    {
        var manager = CreateManager(CustodioId);

        var result = await manager.UpdateMemoryAsync(new ChatMemoryId(Guid.NewGuid()), "Contenido");

        Assert.True(result.IsFailure);
        Assert.Equal("Chat memory not found", result.Error.Message);
    }

    // --- Feature flag ----------------------------------------------------------------------

    [Fact]
    public async Task GetMemoriesAsync_ShouldFail_WhenChatMemoryIsDisabled()
    {
        var baulId = await SeedBaulAsync();
        var manager = CreateManager(CustodioId, new StaticAppConfiguration(chatMemoryEnabled: false));

        var result = await manager.GetMemoriesAsync(baulId);

        Assert.True(result.IsFailure);
        Assert.Equal("Chat memory is not enabled", result.Error.Message);
    }

    // --- Editing -----------------------------------------------------------------------------

    [Fact]
    public async Task UpdateMemoryAsync_ShouldUpdateContent_AndRegenerateTheEmbedding()
    {
        var baulId = await SeedBaulAsync();
        var memory = await SeedMemoryAsync(baulId, new UserId(CustodioId));
        _embeddingBackend.NextEmbedResult = Result.Success<float[]>([0f, 1f]);

        var result = await CreateManager(CustodioId).UpdateMemoryAsync(memory.Id, "El abuelo Manuel trabajó 30 años en Muebles López.");

        Assert.True(result.IsSuccess);
        Assert.Equal("El abuelo Manuel trabajó 30 años en Muebles López.", result.Value.Content);

        var updated = await _chatMemoryRepository.GetByIdAsync(memory.Id);
        Assert.Equal("El abuelo Manuel trabajó 30 años en Muebles López.", updated!.Content);

        var embedding = (await _chatMemoryEmbeddingRepository.GetByBaulAndUserAsync(baulId, new UserId(CustodioId))).Single();
        Assert.Equal(new[] { 0f, 1f }, embedding.Vector);
    }

    [Fact]
    public async Task UpdateMemoryAsync_ShouldNotChangeAnything_WhenEmbeddingFails()
    {
        var baulId = await SeedBaulAsync();
        var memory = await SeedMemoryAsync(baulId, new UserId(CustodioId));
        _embeddingBackend.NextEmbedResult = Result.Failure<float[]>(ApplicationError.ExternalDependencyUnavailable("down"));

        var result = await CreateManager(CustodioId).UpdateMemoryAsync(memory.Id, "Contenido nuevo");

        Assert.True(result.IsFailure);
        var unchanged = await _chatMemoryRepository.GetByIdAsync(memory.Id);
        Assert.Equal(memory.Content, unchanged!.Content);
    }

    [Fact]
    public async Task UpdateMemoryAsync_ShouldFail_WhenContentIsBlank()
    {
        var baulId = await SeedBaulAsync();
        var memory = await SeedMemoryAsync(baulId, new UserId(CustodioId));

        var result = await CreateManager(CustodioId).UpdateMemoryAsync(memory.Id, "   ");

        Assert.True(result.IsFailure);
        Assert.Equal("Content is required", result.Error.Message);
    }

    // --- Deletion ------------------------------------------------------------------------

    [Fact]
    public async Task DeleteMemoryAsync_ShouldRemoveTheMemory_AndItsEmbedding()
    {
        var baulId = await SeedBaulAsync();
        var memory = await SeedMemoryAsync(baulId, new UserId(CustodioId));

        var result = await CreateManager(CustodioId).DeleteMemoryAsync(memory.Id);

        Assert.True(result.IsSuccess);
        Assert.Null(await _chatMemoryRepository.GetByIdAsync(memory.Id));
        Assert.Empty(await _chatMemoryEmbeddingRepository.GetByBaulAndUserAsync(baulId, new UserId(CustodioId)));
    }
}
