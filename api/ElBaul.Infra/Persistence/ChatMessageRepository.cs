using ElBaul.Core.Chat.Domain;
using ElBaul.Core.Chat.OutputPorts;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

public class ChatMessageRepository(ElBaulDbContext dbContext) : IChatMessageRepository
{
    public async Task<IEnumerable<ChatMessage>> GetByBaulAndUserAsync(BaulId baulId, UserId userId) =>
        await dbContext.ChatMessages.AsNoTracking()
            .Where(m => m.BaulId == baulId && m.UserId == userId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();

    public async Task CreateAsync(ChatMessage message)
    {
        dbContext.ChatMessages.Add(message);
        await dbContext.SaveChangesAsync();
    }
}
