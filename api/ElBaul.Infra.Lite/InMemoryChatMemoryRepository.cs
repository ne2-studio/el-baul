using ElBaul.Core.Chat.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

// See InMemoryUserRepository.cs for why every method here locks and materializes query
// results before returning.
public class InMemoryChatMemoryRepository : IChatMemoryRepository
{
    private readonly Dictionary<ChatMemoryId, ChatMemory> _memories = new();
    private readonly Lock _lock = new();

    public Task<IEnumerable<ChatMemory>> GetByBaulAndUserAsync(BaulId baulId, UserId userId)
    {
        lock (_lock)
            return Task.FromResult(_memories.Values.Where(m => m.BaulId == baulId && m.UserId == userId).ToList().AsEnumerable());
    }

    public Task<ChatMemory?> GetByIdAsync(ChatMemoryId chatMemoryId)
    {
        lock (_lock) return Task.FromResult(_memories.GetValueOrDefault(chatMemoryId));
    }

    public Task CreateAsync(ChatMemory memory)
    {
        lock (_lock) _memories[memory.Id] = memory;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(ChatMemory memory)
    {
        lock (_lock) _memories[memory.Id] = memory;
        return Task.CompletedTask;
    }

    public Task DeleteAsync(ChatMemoryId chatMemoryId)
    {
        lock (_lock) _memories.Remove(chatMemoryId);
        return Task.CompletedTask;
    }
}
