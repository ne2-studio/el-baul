using ElBaul.Core.Recuerdos.Domain;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Microsoft.Extensions.Logging;
using ElBaul.Domain;

namespace ElBaul.Core.Chat.Application;

public interface IRelevantRecuerdoSelector
{
    Task<List<Recuerdo>> SelectAsync(BaulId baulId, List<Recuerdo> recuerdos, string query);
}

public class RelevantRecuerdoSelector(
    ILogger<RelevantRecuerdoSelector> logger,
    IRecuerdoEmbeddingRepository recuerdoEmbeddingRepository,
    IEmbeddingBackend embeddingBackend,
    IClock clock) : IRelevantRecuerdoSelector
{
    // Only the recuerdos most relevant to the current question are sent to the model. Keeps the
    // prompt (and its cost) bounded regardless of how much a baúl has grown.
    private const int MaxRelevantRecuerdos = 20;

    // Real RAG, no vector database: embeddings are computed lazily (the first time a recuerdo
    // is needed for ranking) and cached in RecuerdoEmbeddings; similarity is brute-force cosine
    // in memory, which is plenty fast at a single family's baúl scale. If a baúl ever grows
    // large enough for that to matter, that's the point to reach for pgvector/ANN.
    public async Task<List<Recuerdo>> SelectAsync(BaulId baulId, List<Recuerdo> recuerdos, string query)
    {
        if (recuerdos.Count <= MaxRelevantRecuerdos) return recuerdos;

        var embeddingsByRecuerdoId = (await recuerdoEmbeddingRepository.GetByBaulIdAsync(baulId))
            .ToDictionary(e => e.RecuerdoId);

        var stale = recuerdos
            .Where(r => !embeddingsByRecuerdoId.TryGetValue(r.Id, out var existing) || existing.Model != embeddingBackend.ModelId)
            .ToList();

        if (stale.Count > 0)
        {
            var embedResult = await embeddingBackend.EmbedManyAsync(stale.Select(r => r.Text).ToList());
            if (embedResult.IsSuccess)
            {
                var now = clock.UtcNow();
                var newEmbeddings = stale.Zip(embedResult.Value,
                    (recuerdo, vector) => new RecuerdoEmbedding(recuerdo.Id, baulId, vector, embeddingBackend.ModelId, now)).ToList();
                await recuerdoEmbeddingRepository.CreateManyAsync(newEmbeddings);
                foreach (var embedding in newEmbeddings)
                    embeddingsByRecuerdoId[embedding.RecuerdoId] = embedding;
            }
            else
            {
                logger.LogWarning(
                    "Could not embed {Count} recuerdos, ranking with what's already indexed {Error}",
                    stale.Count, embedResult.Error);
            }
        }

        var queryEmbeddingResult = await embeddingBackend.EmbedAsync(query);
        if (queryEmbeddingResult.IsFailure)
        {
            // Ranking isn't possible, but the chat turn shouldn't fail just because of that.
            logger.LogWarning("Could not embed the query, falling back to most recent recuerdos");
            return recuerdos.OrderByDescending(r => r.CreatedAt).Take(MaxRelevantRecuerdos).ToList();
        }

        return recuerdos
            .Where(r => embeddingsByRecuerdoId.ContainsKey(r.Id))
            .OrderByDescending(r => CosineSimilarity(embeddingsByRecuerdoId[r.Id].Vector, queryEmbeddingResult.Value))
            .Take(MaxRelevantRecuerdos)
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
