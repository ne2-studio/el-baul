namespace ServiceTemplate.Ports.Output;

public interface ITaskRepository
{
    Task SaveAsync(TaskItem task);
    Task DeleteAsync(Guid id, string userId);
    Task<TaskItem?> LoadByIdAsync(Guid id, string userId);
    Task<IEnumerable<TaskItem>> ListAsync(string userId, int skip = 0, int take = 10);
}
