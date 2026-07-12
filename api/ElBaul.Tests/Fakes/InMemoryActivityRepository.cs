using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class InMemoryActivityRepository : IActivityRepository
{
    private readonly List<Activity> _activities = [];

    public Task<IEnumerable<Activity>> GetByBaulIdsAsync(IEnumerable<Guid> baulIds)
    {
        var ids = baulIds.ToHashSet();
        return Task.FromResult(_activities.Where(a => ids.Contains(a.BaulId)));
    }

    public Task CreateAsync(Activity activity)
    {
        _activities.Add(activity);
        return Task.CompletedTask;
    }
}
