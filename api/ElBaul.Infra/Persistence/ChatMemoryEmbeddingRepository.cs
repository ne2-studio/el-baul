using ElBaul.Core.Chat.Domain;
using ElBaul.Core.Chat.OutputPorts;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

public class ChatMemoryEmbeddingRepository(ElBaulDbContext dbContext) : IChatMemoryEmbeddingRepository
{
    public async Task<IEnumerable<ChatMemoryEmbedding>> GetByBaulAndUserAsync(BaulId baulId, UserId userId) =>
        await dbContext.ChatMemoryEmbeddings.AsNoTracking()
            .Where(e => e.BaulId == baulId && e.UserId == userId)
            .ToListAsync();

    public async Task UpsertAsync(ChatMemoryEmbedding embedding)
    {
        var existing = await dbContext.ChatMemoryEmbeddings.FindAsync(embedding.ChatMemoryId);
        if (existing is not null)
            dbContext.Entry(existing).CurrentValues.SetValues(embedding);
        else
            dbContext.ChatMemoryEmbeddings.Add(embedding);

        await dbContext.SaveChangesAsync();
    }

    public async Task DeleteAsync(ChatMemoryId chatMemoryId) =>
        await dbContext.ChatMemoryEmbeddings.Where(e => e.ChatMemoryId == chatMemoryId).ExecuteDeleteAsync();
}
