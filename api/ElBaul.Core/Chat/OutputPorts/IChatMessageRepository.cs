using ElBaul.Domain;
namespace ElBaul.Core.Chat.OutputPorts;
public interface IChatMessageRepository
{
    /// <summary>The single ongoing conversation thread for a user in a baúl, oldest first —
    /// this is both the history shown in the UI and the history sent to the model.</summary>
    Task<IEnumerable<ChatMessage>> GetByBaulAndUserAsync(BaulId baulId, UserId userId);

    Task CreateAsync(ChatMessage message);
}
