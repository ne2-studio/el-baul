using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class InMemoryChatMessageRepository : IChatMessageRepository
{
    private readonly List<ChatMessage> _messages = [];

    public Task<IEnumerable<ChatMessage>> GetByBaulAndUserAsync(BaulId baulId, string userId) =>
        Task.FromResult(_messages.Where(m => m.BaulId == baulId && m.UserId == userId).OrderBy(m => m.CreatedAt).AsEnumerable());

    public Task CreateAsync(ChatMessage message)
    {
        _messages.Add(message);
        return Task.CompletedTask;
    }
}
