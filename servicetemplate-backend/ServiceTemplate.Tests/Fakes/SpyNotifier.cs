using ServiceTemplate.Ports.Output;

namespace ServiceTemplate.Tests.Fakes;

public class SpyNotifier : INotifier
{
    public List<TaskItem> NotifiedTasks { get; } = new();

    public Task NotifyTaskCreatedAsync(TaskItem task)
    {
        NotifiedTasks.Add(task);
        return Task.CompletedTask;
    }
}
