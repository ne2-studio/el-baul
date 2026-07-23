namespace ElBaul.Ports.Output;

public interface IChatMessageRepository
{
    /// <summary>The single ongoing conversation thread for a user in a baúl, oldest first —
    /// this is both the history shown in the UI and the history sent to the model.</summary>
    Task<IEnumerable<ChatMessage>> GetByBaulAndUserAsync(Guid baulId, string userId);

    Task CreateAsync(ChatMessage message);
}
