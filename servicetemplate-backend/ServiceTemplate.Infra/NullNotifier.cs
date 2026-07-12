using ServiceTemplate.Ports.Output;

namespace ServiceTemplate.Infra;

public class NullNotifier : INotifier
{
    public Task NotifyTaskCreatedAsync(TaskItem task)
    {
        return Task.CompletedTask;
    }
}
