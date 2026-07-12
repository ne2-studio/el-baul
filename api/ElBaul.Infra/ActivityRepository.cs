using ElBaul.Ports.Output;
using Microsoft.EntityFrameworkCore;

namespace ElBaul.Infra;

public class ActivityRepository(ElBaulDbContext dbContext) : IActivityRepository
{
    public async Task<IEnumerable<Activity>> GetByBaulIdsAsync(IEnumerable<Guid> baulIds)
    {
        var ids = baulIds.ToList();
        if (ids.Count == 0) return [];

        return await dbContext.Activities.AsNoTracking().Where(a => ids.Contains(a.BaulId)).ToListAsync();
    }

    public async Task CreateAsync(Activity activity)
    {
        dbContext.Activities.Add(activity);
        await dbContext.SaveChangesAsync();
    }
}
