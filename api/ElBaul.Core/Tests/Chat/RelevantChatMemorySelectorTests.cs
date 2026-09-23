using ElBaul.Core.Chat.Domain;
using ElBaul.Core.Chat.Application;
using ElBaul.Infra.Lite;
using ElBaul.Core.Chat.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Tests.Fakes;
using Microsoft.Extensions.Logging.Abstractions;
using Ne2Studio.Common;
using ElBaul.Domain;

namespace ElBaul.Tests;

public class RelevantChatMemorySelectorTests
{
    private const string CustodioId = "custodio-1";
    private const string OtherUserId = "user-2";

    private readonly InMemoryChatMemoryRepository _chatMemoryRepository = new();
    private readonly InMemoryChatMemoryEmbeddingRepository _chatMemoryEmbeddingRepository = new();
    private readonly StaticClock _clock = new();

    private RelevantChatMemorySelector CreateSelector(IEmbeddingBackend? embeddingBackend = null, int retrievalLimit = 2) =>
        new(NullLogger<RelevantChatMemorySelector>.Instance, _chatMemoryRepository, _chatMemoryEmbeddingRepository,
            embeddingBackend ?? new FakeEmbeddingBackend([]), new StaticAppConfiguration(chatMemoryRetrievalLimit: retrievalLimit));

    private async Task<ChatMemory> SeedAsync(BaulId baulId, UserId userId, string content, DateTime? updatedAt = null)
    {
        var timestamp = updatedAt ?? _clock.UtcNow();
        var memory = new ChatMemory(new ChatMemoryId(Guid.NewGuid()), baulId, userId, content, timestamp, timestamp, null);
        await _chatMemoryRepository.CreateAsync(memory);
        return memory;
    }

    [Fact]
    public async Task SelectAsync_ShouldReturnAllMemories_WithoutEmbedding_WhenAtOrBelowTheLimit()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var userId = new UserId(CustodioId);
        await SeedAsync(baulId, userId, "Uno");
        await SeedAsync(baulId, userId, "Dos");
        var embeddingBackend = new FakeEmbeddingBackend([])
        {
            NextEmbedResult = Result.Failure<float[]>(ApplicationError.ExternalDependencyUnavailable("Should not embed"))
        };

        var selected = await CreateSelector(embeddingBackend, retrievalLimit: 2).SelectAsync(baulId, userId, "consulta");

        Assert.Equal(2, selected.Count);
    }

    [Fact]
    public async Task SelectAsync_ShouldOrderBySimilarity_WhenAboveTheLimit()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var userId = new UserId(CustodioId);
        var relevant = await SeedAsync(baulId, userId, "El abuelo trabajó en Muebles López");
        var other = await SeedAsync(baulId, userId, "La familia veranea en la playa");
        await _chatMemoryEmbeddingRepository.UpsertAsync(new ChatMemoryEmbedding(relevant.Id, baulId, userId, [1f, 0f], "fake-embedding-model", _clock.UtcNow()));
        await _chatMemoryEmbeddingRepository.UpsertAsync(new ChatMemoryEmbedding(other.Id, baulId, userId, [0f, 1f], "fake-embedding-model", _clock.UtcNow()));
        var embeddingBackend = new FakeEmbeddingBackend([]) { NextEmbedResult = Result.Success<float[]>([1f, 0f]) };

        var selected = await CreateSelector(embeddingBackend, retrievalLimit: 1).SelectAsync(baulId, userId, "¿Dónde trabajó el abuelo?");

        Assert.Single(selected);
        Assert.Equal(relevant.Id, selected[0].Id);
    }

    [Fact]
    public async Task SelectAsync_ShouldExcludeMemories_WithoutAnEmbedding()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var userId = new UserId(CustodioId);
        var withEmbedding = await SeedAsync(baulId, userId, "Con embedding");
        await SeedAsync(baulId, userId, "Sin embedding");
        await SeedAsync(baulId, userId, "Otra memoria más");
        await _chatMemoryEmbeddingRepository.UpsertAsync(new ChatMemoryEmbedding(withEmbedding.Id, baulId, userId, [1f], "fake-embedding-model", _clock.UtcNow()));
        var embeddingBackend = new FakeEmbeddingBackend([]) { NextEmbedResult = Result.Success<float[]>([1f]) };

        var selected = await CreateSelector(embeddingBackend, retrievalLimit: 1).SelectAsync(baulId, userId, "consulta");

        Assert.Equal([withEmbedding], selected);
    }

    [Fact]
    public async Task SelectAsync_ShouldFallBackToMostRecentlyUpdated_WhenEmbeddingTheQueryFails()
    {
        var baulId = new BaulId(Guid.NewGuid());
        var userId = new UserId(CustodioId);
        var now = _clock.UtcNow();
        await SeedAsync(baulId, userId, "Antigua", now.AddDays(-2));
        var recent = await SeedAsync(baulId, userId, "Reciente", now);
        await SeedAsync(baulId, userId, "Otra más", now.AddDays(-1));
        var embeddingBackend = new FakeEmbeddingBackend([])
        {
            NextEmbedResult = Result.Failure<float[]>(ApplicationError.ExternalDependencyUnavailable("down"))
        };

        var selected = await CreateSelector(embeddingBackend, retrievalLimit: 1).SelectAsync(baulId, userId, "consulta");

        Assert.Single(selected);
        Assert.Equal(recent.Id, selected[0].Id);
    }

    // --- Scoping -------------------------------------------------------------------------

    [Fact]
    public async Task SelectAsync_ShouldNeverReturnAnotherUsersMemories_EvenInTheSameBaul()
    {
        var baulId = new BaulId(Guid.NewGuid());
        await SeedAsync(baulId, new UserId(OtherUserId), "Memoria de otro usuario");

        var selected = await CreateSelector().SelectAsync(baulId, new UserId(CustodioId), "consulta");

        Assert.Empty(selected);
    }

    [Fact]
    public async Task SelectAsync_ShouldNeverReturnMemories_FromAnotherBaul()
    {
        var userId = new UserId(CustodioId);
        await SeedAsync(new BaulId(Guid.NewGuid()), userId, "Memoria de otro baúl");

        var selected = await CreateSelector().SelectAsync(new BaulId(Guid.NewGuid()), userId, "consulta");

        Assert.Empty(selected);
    }
}
