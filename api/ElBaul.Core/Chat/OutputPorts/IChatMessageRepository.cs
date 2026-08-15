using ElBaul.Domain;
namespace ElBaul.OutputPorts.Chat;
public interface IChatMessageRepository
{
    /// <summary>The single ongoing conversation thread for a user in a baúl, oldest first —
    /// this is both the history shown in the UI and the history sent to the model.</summary>
    Task<IEnumerable<ChatMessage>> GetByBaulAndUserAsync(BaulId baulId, UserId userId);

    /// <summary>Every chat message in the system, unscoped — used only by the one-off backfill
    /// command (see ElBaul.Maintenance/Commands/BackfillChatMemoriesCommand.cs).</summary>
    Task<IEnumerable<ChatMessage>> GetAllAsync();

    Task CreateAsync(ChatMessage message);
}
