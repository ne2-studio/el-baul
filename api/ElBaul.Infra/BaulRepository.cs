using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra;

public class BaulRepository(ElBaulDbContext dbContext) : IBaulRepository
{
    public Task<Baul?> GetByIdAsync(Guid id) =>
        dbContext.Baules.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id);

    public async Task<IEnumerable<Baul>> GetOwnedByUserIdAsync(string userId) =>
        await dbContext.Baules.AsNoTracking().Where(b => b.CustodioId == userId).ToListAsync();

    public async Task<IEnumerable<BaulAccess>> GetSharedByUserIdAsync(string userId)
    {
        var rows = await dbContext.SharedUsers.AsNoTracking()
            .Where(s => s.UserId == userId)
            .Join(dbContext.Baules.AsNoTracking(), s => s.BaulId, b => b.Id, (s, b) => new { Baul = b, s.Role })
            .ToListAsync();

        return rows.Select(r => new BaulAccess(r.Baul, r.Role));
    }

    public async Task CreateAsync(Baul baul)
    {
        dbContext.Baules.Add(baul);
        await dbContext.SaveChangesAsync();
    }

    public async Task UpdateAsync(Baul baul)
    {
        dbContext.Baules.Update(baul);
        await dbContext.SaveChangesAsync();
    }

    public async Task<IEnumerable<SharedUser>> GetSharedUsersAsync(Guid baulId) =>
        await dbContext.SharedUsers.AsNoTracking().Where(s => s.BaulId == baulId).ToListAsync();

    public Task<SharedUser?> GetSharedUserByIdAsync(Guid sharedUserId) =>
        dbContext.SharedUsers.AsNoTracking().FirstOrDefaultAsync(s => s.Id == sharedUserId);

    public Task<SharedUser?> GetSharedUserByUserIdAsync(Guid baulId, string userId) =>
        dbContext.SharedUsers.AsNoTracking().FirstOrDefaultAsync(s => s.BaulId == baulId && s.UserId == userId);

    public Task<SharedUser?> GetSharedUserByEmailAsync(Guid baulId, string email) =>
        dbContext.SharedUsers.AsNoTracking().FirstOrDefaultAsync(s => s.BaulId == baulId && s.Email == email);

    public async Task AddSharedUserAsync(SharedUser sharedUser)
    {
        dbContext.SharedUsers.Add(sharedUser);
        await dbContext.SaveChangesAsync();
    }

    public async Task UpdateSharedUserAsync(SharedUser sharedUser)
    {
        dbContext.SharedUsers.Update(sharedUser);
        await dbContext.SaveChangesAsync();
    }

    public async Task RemoveSharedUserAsync(Guid baulId, string email)
    {
        await dbContext.SharedUsers.Where(s => s.BaulId == baulId && s.Email == email).ExecuteDeleteAsync();
    }

    public async Task<IEnumerable<AccessRequest>> GetAccessRequestsAsync(Guid baulId) =>
        await dbContext.AccessRequests.AsNoTracking().Where(r => r.BaulId == baulId).ToListAsync();

    public Task<AccessRequest?> GetAccessRequestAsync(Guid baulId, Guid requestId) =>
        dbContext.AccessRequests.AsNoTracking().FirstOrDefaultAsync(r => r.BaulId == baulId && r.Id == requestId);

    public async Task CreateAccessRequestAsync(AccessRequest request)
    {
        dbContext.AccessRequests.Add(request);
        await dbContext.SaveChangesAsync();
    }

    public async Task DeleteAccessRequestAsync(Guid baulId, Guid requestId)
    {
        await dbContext.AccessRequests.Where(r => r.BaulId == baulId && r.Id == requestId).ExecuteDeleteAsync();
    }

    public async Task<IEnumerable<RemovalRequest>> GetRemovalRequestsAsync(Guid baulId) =>
        await dbContext.RemovalRequests.AsNoTracking().Where(r => r.BaulId == baulId).ToListAsync();

    public Task<RemovalRequest?> GetRemovalRequestAsync(Guid baulId, Guid requestId) =>
        dbContext.RemovalRequests.AsNoTracking().FirstOrDefaultAsync(r => r.BaulId == baulId && r.Id == requestId);

    public async Task CreateRemovalRequestAsync(RemovalRequest request)
    {
        dbContext.RemovalRequests.Add(request);
        await dbContext.SaveChangesAsync();
    }

    public async Task DeleteRemovalRequestAsync(Guid baulId, Guid requestId)
    {
        await dbContext.RemovalRequests.Where(r => r.BaulId == baulId && r.Id == requestId).ExecuteDeleteAsync();
    }
}
