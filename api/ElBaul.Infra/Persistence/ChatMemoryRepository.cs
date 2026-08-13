using ElBaul.OutputPorts.Memories;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

public class ChatMemoryRepository(ElBaulDbContext dbContext) : IChatMemoryRepository
{
    public async Task<IEnumerable<ChatMemory>> GetByBaulAndUserAsync(BaulId baulId, UserId userId) =>
        await dbContext.ChatMemories.AsNoTracking()
            .Where(m => m.BaulId == baulId && m.UserId == userId)
            .ToListAsync();

    public Task<ChatMemory?> GetByIdAsync(ChatMemoryId chatMemoryId) =>
        dbContext.ChatMemories.AsNoTracking().FirstOrDefaultAsync(m => m.Id == chatMemoryId);

    public async Task CreateAsync(ChatMemory memory)
    {
        dbContext.ChatMemories.Add(memory);
        await dbContext.SaveChangesAsync();
    }

    public async Task UpdateAsync(ChatMemory memory)
    {
        dbContext.ChatMemories.Update(memory);
        await dbContext.SaveChangesAsync();
    }

    public async Task DeleteAsync(ChatMemoryId chatMemoryId) =>
        await dbContext.ChatMemories.Where(m => m.Id == chatMemoryId).ExecuteDeleteAsync();
}
