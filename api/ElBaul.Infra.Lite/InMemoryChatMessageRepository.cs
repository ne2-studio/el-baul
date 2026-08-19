using ElBaul.Core.Chat.Domain;
using ElBaul.Core.Chat.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Infra.Lite;

// See InMemoryUserRepository.cs for why every method here locks and materializes query
// results before returning.
public class InMemoryChatMessageRepository : IChatMessageRepository
{
    private readonly List<ChatMessage> _messages = [];
    private readonly Lock _lock = new();

    public Task<IEnumerable<ChatMessage>> GetByBaulAndUserAsync(BaulId baulId, UserId userId)
    {
        lock (_lock) return Task.FromResult(_messages.Where(m => m.BaulId == baulId && m.UserId == userId).OrderBy(m => m.CreatedAt).ToList().AsEnumerable());
    }

    public Task CreateAsync(ChatMessage message)
    {
        lock (_lock) _messages.Add(message);
        return Task.CompletedTask;
    }
}
