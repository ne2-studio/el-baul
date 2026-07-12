using System.Collections.Concurrent;
using ServiceTemplate.Ports.Output;

namespace ServiceTemplate.Infra;

/// <summary>
/// Caching decorator over ITaskRepository, composed as a Singleton in ServiceRegistration
/// so the cache survives across requests (the deliberate exception to the default Scoped lifetime).
/// </summary>
public class CachedTaskRepository(ITaskRepository repository) : ITaskRepository
{
    private readonly ConcurrentDictionary<Guid, TaskItem> _cache = new();

    public async Task SaveAsync(TaskItem task)
    {
        await repository.SaveAsync(task);
        _cache[task.Id] = task;
    }

    public async Task DeleteAsync(Guid id, string userId)
    {
        await repository.DeleteAsync(id, userId);
        _cache.TryRemove(id, out _);
    }

    public async Task<TaskItem?> LoadByIdAsync(Guid id, string userId)
    {
        // Cache is keyed by id alone (globally unique), so ownership must still be checked
        // on every lookup to avoid leaking another user's cached task.
        if (_cache.TryGetValue(id, out var cached))
        {
            return cached.UserId == userId ? cached : null;
        }

        var task = await repository.LoadByIdAsync(id, userId);
        if (task != null)
        {
            _cache[id] = task;
        }

        return task;
    }

    public Task<IEnumerable<TaskItem>> ListAsync(string userId, int skip = 0, int take = 10)
    {
        return repository.ListAsync(userId, skip, take);
    }
}
