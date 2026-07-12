using ServiceTemplate.Ports.Output;

namespace ServiceTemplate.Tests.Fakes;

public class InMemoryTaskRepository : ITaskRepository
{
    private readonly Dictionary<Guid, TaskItem> storage = new();

    public Task SaveAsync(TaskItem task)
    {
        storage[task.Id] = task;
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Guid id, string userId)
    {
        if (storage.TryGetValue(id, out var task) && task.UserId == userId)
        {
            storage.Remove(id);
        }

        return Task.CompletedTask;
    }

    public Task<TaskItem?> LoadByIdAsync(Guid id, string userId)
    {
        var task = storage.GetValueOrDefault(id);
        return Task.FromResult(task != null && task.UserId == userId ? task : null);
    }

    public Task<IEnumerable<TaskItem>> ListAsync(string userId, int skip = 0, int take = 10)
    {
        return Task.FromResult(storage.Values.Where(t => t.UserId == userId).Skip(skip).Take(take));
    }
}
