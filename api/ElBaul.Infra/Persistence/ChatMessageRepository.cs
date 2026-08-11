using ElBaul.OutputPorts.Chat;
using ElBaul.OutputPorts.Users;
using ElBaul.Shared;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra.Persistence;

public class ChatMessageRepository(ElBaulDbContext dbContext) : IChatMessageRepository
{
    public async Task<IEnumerable<ChatMessage>> GetByBaulAndUserAsync(BaulId baulId, string userId) =>
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
