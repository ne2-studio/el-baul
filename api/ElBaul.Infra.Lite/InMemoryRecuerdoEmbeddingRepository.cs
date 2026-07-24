using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

// See InMemoryUserRepository.cs for why every method here locks and materializes query
// results before returning.
public class InMemoryRecuerdoEmbeddingRepository : IRecuerdoEmbeddingRepository
{
    private readonly Dictionary<RecuerdoId, RecuerdoEmbedding> _embeddings = new();
    private readonly Lock _lock = new();

    public Task<IEnumerable<RecuerdoEmbedding>> GetByBaulIdAsync(BaulId baulId)
    {
        lock (_lock) return Task.FromResult(_embeddings.Values.Where(e => e.BaulId == baulId).ToList().AsEnumerable());
    }

    public Task<IEnumerable<RecuerdoEmbedding>> GetAllAsync()
    {
        lock (_lock) return Task.FromResult(_embeddings.Values.ToList().AsEnumerable());
    }

    public Task CreateManyAsync(IEnumerable<RecuerdoEmbedding> embeddings)
    {
        lock (_lock)
        {
            foreach (var embedding in embeddings)
                _embeddings[embedding.RecuerdoId] = embedding;
        }
        return Task.CompletedTask;
    }
}
