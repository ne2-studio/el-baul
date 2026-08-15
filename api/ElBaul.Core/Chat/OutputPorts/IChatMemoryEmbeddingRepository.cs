using ElBaul.Domain;
namespace ElBaul.Core.Chat.OutputPorts;
public interface IChatMemoryEmbeddingRepository
{
    Task<IEnumerable<ChatMemoryEmbedding>> GetByBaulAndUserAsync(BaulId baulId, UserId userId);

    /// <summary>Upsert by ChatMemoryId (the primary key) — a memory's embedding is always
    /// regenerated in full (ADD, UPDATE, or a manual edit), never partially patched.</summary>
    Task UpsertAsync(ChatMemoryEmbedding embedding);

    Task DeleteAsync(ChatMemoryId chatMemoryId);
}
