using ElBaul.Core.Moderation.Domain;
using ElBaul.Core.Moderation.OutputPorts;
using Microsoft.EntityFrameworkCore;

using ElBaul.Domain;
namespace ElBaul.Infra.Persistence;

public class RemovalRequestRepository(ElBaulDbContext dbContext) : IRemovalRequestRepository
{
    public async Task<IEnumerable<RemovalRequest>> GetRemovalRequestsAsync(BaulId baulId) =>
        await dbContext.RemovalRequests.AsNoTracking().Where(r => r.BaulId == baulId).ToListAsync();

    public Task<RemovalRequest?> GetRemovalRequestAsync(BaulId baulId, RemovalRequestId requestId) =>
        dbContext.RemovalRequests.AsNoTracking().FirstOrDefaultAsync(r => r.BaulId == baulId && r.Id == requestId);

    public async Task CreateRemovalRequestAsync(RemovalRequest request)
    {
        dbContext.RemovalRequests.Add(request);
        await dbContext.SaveChangesAsync();
    }

    public async Task DeleteRemovalRequestAsync(BaulId baulId, RemovalRequestId requestId)
    {
        await dbContext.RemovalRequests.Where(r => r.BaulId == baulId && r.Id == requestId).ExecuteDeleteAsync();
    }

    public async Task DeleteByBaulIdAsync(BaulId baulId)
    {
        await dbContext.RemovalRequests.Where(r => r.BaulId == baulId).ExecuteDeleteAsync();
    }
}
