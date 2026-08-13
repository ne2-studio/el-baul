using ElBaul.OutputPorts.Memories;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

public class InMemoryChatMemoryEmbeddingRepository : IChatMemoryEmbeddingRepository
{
    private readonly Dictionary<ChatMemoryId, ChatMemoryEmbedding> _embeddings = new();
    private readonly Lock _lock = new();

    public Task<IEnumerable<ChatMemoryEmbedding>> GetByBaulAndUserAsync(BaulId baulId, UserId userId)
    {
        lock (_lock)
            return Task.FromResult(_embeddings.Values.Where(e => e.BaulId == baulId && e.UserId == userId).ToList().AsEnumerable());
    }

    public Task UpsertAsync(ChatMemoryEmbedding embedding)
    {
        lock (_lock) _embeddings[embedding.ChatMemoryId] = embedding;
        return Task.CompletedTask;
    }

    public Task DeleteAsync(ChatMemoryId chatMemoryId)
    {
        lock (_lock) _embeddings.Remove(chatMemoryId);
        return Task.CompletedTask;
    }
}
