using ElBaul.OutputPorts.Memories;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;
using Microsoft.Extensions.Logging;
using ElBaul.Domain;

namespace ElBaul.Application.Chat;

public interface IRelevantChatMemorySelector
{
    Task<List<ChatMemory>> SelectAsync(BaulId baulId, UserId userId, string query);
}

// RAG ranking for a single user's memories within a baúl — the memory equivalent of
// RelevantRecuerdoSelector, kept as its own class (rather than folded into that one) because
// memories are scoped by (BaulId, UserId) instead of just BaulId, and their embeddings are
// always written eagerly by ChatMemoryManager/ChatMemoryExtractionManager on ADD/UPDATE — there
// is no lazy backfill-on-read path to reuse from that class either. Brute-force cosine
// similarity in memory, same justification as RelevantRecuerdoSelector: plenty fast at a single
// user's per-baúl memory count.
public class RelevantChatMemorySelector(
    ILogger<RelevantChatMemorySelector> logger,
    IChatMemoryRepository chatMemoryRepository,
    IChatMemoryEmbeddingRepository chatMemoryEmbeddingRepository,
    IEmbeddingBackend embeddingBackend,
    IAppConfiguration appConfiguration) : IRelevantChatMemorySelector
{
    public async Task<List<ChatMemory>> SelectAsync(BaulId baulId, UserId userId, string query)
    {
        var limit = appConfiguration.ChatMemoryRetrievalLimit;
        var memories = (await chatMemoryRepository.GetByBaulAndUserAsync(baulId, userId)).ToList();
        if (memories.Count <= limit) return memories;

        var embeddingsById = (await chatMemoryEmbeddingRepository.GetByBaulAndUserAsync(baulId, userId))
            .ToDictionary(e => e.ChatMemoryId);

        var queryEmbeddingResult = await embeddingBackend.EmbedAsync(query);
        if (queryEmbeddingResult.IsFailure)
        {
            // Ranking isn't possible, but neither chat retrieval nor extraction's dedup context
            // should fail just because of that.
            logger.LogWarning("Could not embed the query, falling back to most recently updated memories");
            return memories.OrderByDescending(m => m.UpdatedAt).Take(limit).ToList();
        }

        return memories
            // A memory can legitimately have no embedding yet if the write that created/updated
            // it couldn't reach the embedding backend — excluded from ranking rather than
            // guessed at, same as RelevantRecuerdoSelector's stale-refresh-failed case.
            .Where(m => embeddingsById.ContainsKey(m.Id))
            .OrderByDescending(m => CosineSimilarity(embeddingsById[m.Id].Vector, queryEmbeddingResult.Value))
            .Take(limit)
            .ToList();
    }

    private static double CosineSimilarity(float[] a, float[] b)
    {
        double dot = 0, normA = 0, normB = 0;
        for (var i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dot / (Math.Sqrt(normA) * Math.Sqrt(normB) + 1e-9);
    }
}
