using ElBaul.Core.Chat.Domain;
using ElBaul.Domain;
namespace ElBaul.Core.Chat.OutputPorts;
public interface IChatMemoryRepository
{
    Task<IEnumerable<ChatMemory>> GetByBaulAndUserAsync(BaulId baulId, UserId userId);

    Task<ChatMemory?> GetByIdAsync(ChatMemoryId chatMemoryId);

    Task CreateAsync(ChatMemory memory);

    Task UpdateAsync(ChatMemory memory);

    Task DeleteAsync(ChatMemoryId chatMemoryId);
}
