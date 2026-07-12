namespace ElBaul.Ports.Output;

public interface IActivityRepository
{
    Task<IEnumerable<Activity>> GetByBaulIdsAsync(IEnumerable<Guid> baulIds);
    Task CreateAsync(Activity activity);
}
