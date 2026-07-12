using Microsoft.Extensions.Logging;
using ServiceTemplate.Ports.Output;

namespace ServiceTemplate.Infra;

/// <summary>
/// Stand-in for a real external notification adapter (e.g. a webhook call or a message queue publish).
/// Swap the body for the actual integration when this template is adapted for a real service.
/// </summary>
public class LoggingNotifier(ILogger<LoggingNotifier> logger) : INotifier
{
    public Task NotifyTaskCreatedAsync(TaskItem task)
    {
        logger.LogInformation("Notifying external systems that task {Id} ({Title}) was created", task.Id, task.Title);
        return Task.CompletedTask;
    }
}
