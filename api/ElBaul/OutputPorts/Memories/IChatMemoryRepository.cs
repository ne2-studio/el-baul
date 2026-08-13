using ElBaul.Domain;
namespace ElBaul.OutputPorts.Memories;
public interface IChatMemoryRepository
{
    Task<IEnumerable<ChatMemory>> GetByBaulAndUserAsync(BaulId baulId, UserId userId);

    Task<ChatMemory?> GetByIdAsync(ChatMemoryId chatMemoryId);

    Task CreateAsync(ChatMemory memory);

    Task UpdateAsync(ChatMemory memory);

    Task DeleteAsync(ChatMemoryId chatMemoryId);
}
