using ElBaul.Domain;
namespace ElBaul.Core.Chat.OutputPorts;
public interface IChatMemoryRepository
{
    Task<IEnumerable<ChatMemory>> GetByBaulAndUserAsync(BaulId baulId, UserId userId);

    Task<ChatMemory?> GetByIdAsync(ChatMemoryId chatMemoryId);

    /// <summary>Every chat memory in the system, unscoped — used only by the one-off backfill
    /// command (see ElBaul.Maintenance/Commands/BackfillChatMemoriesCommand.cs) to find which
    /// source chat messages have already produced a memory.</summary>
    Task<IEnumerable<ChatMemory>> GetAllAsync();

    Task CreateAsync(ChatMemory memory);

    Task UpdateAsync(ChatMemory memory);

    Task DeleteAsync(ChatMemoryId chatMemoryId);
}
