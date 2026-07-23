using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class InMemoryRecuerdoEmbeddingRepository : IRecuerdoEmbeddingRepository
{
    private readonly Dictionary<Guid, RecuerdoEmbedding> _embeddings = new();

    public Task<IEnumerable<RecuerdoEmbedding>> GetByBaulIdAsync(Guid baulId) =>
        Task.FromResult(_embeddings.Values.Where(e => e.BaulId == baulId));

    public Task<IEnumerable<RecuerdoEmbedding>> GetAllAsync() => Task.FromResult(_embeddings.Values.AsEnumerable());

    public Task CreateManyAsync(IEnumerable<RecuerdoEmbedding> embeddings)
    {
        foreach (var embedding in embeddings)
            _embeddings[embedding.RecuerdoId] = embedding;
        return Task.CompletedTask;
    }
}
