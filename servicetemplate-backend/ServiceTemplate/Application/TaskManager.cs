using CSharpFunctionalExtensions;
using Microsoft.Extensions.Logging;
using ServiceTemplate.Ports.Input;
using ServiceTemplate.Ports.Output;

namespace ServiceTemplate.Application;

public class TaskManager(
    ILogger<TaskManager> logger,
    ITaskRepository repository,
    IIdGenerator idGenerator,
    INotifier notifier,
    IClock clock,
    ICurrentUserProvider currentUserProvider) : ITaskManager
{
    public async Task<Result<TaskDto>> CreateAsync(string title)
    {
        logger.LogInformation("CreateAsync - Creating task {Title}", title);

        var userId = currentUserProvider.GetUserId();
        var task = new TaskItem(idGenerator.NewId(), userId, title, clock.UtcNow());
        await repository.SaveAsync(task);
        await notifier.NotifyTaskCreatedAsync(task);

        logger.LogInformation("CreateAsync - Task {Id} created with title {Title}", task.Id, title);
        return ToDto(task);
    }

    public async Task<Result<IEnumerable<TaskDto>>> ListAsync(int skip = 0, int take = 10)
    {
        logger.LogInformation("ListAsync - Fetching tasks with skip {Skip} and take {Take}", skip, take);

        try
        {
            var userId = currentUserProvider.GetUserId();
            var tasks = await repository.ListAsync(userId, skip, take);
            var dtos = tasks.Select(ToDto);
            logger.LogInformation("ListAsync - Successfully fetched {Count} tasks", tasks.Count());
            return Result.Success(dtos);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "ListAsync - Error occurred while fetching tasks");
            return Result.Failure<IEnumerable<TaskDto>>("An error occurred while fetching the list of tasks.");
        }
    }

    public async Task<Result> DeleteAsync(Guid id)
    {
        logger.LogInformation("DeleteAsync - Deleting task {Id}", id);

        var userId = currentUserProvider.GetUserId();
        var task = await repository.LoadByIdAsync(id, userId);

        if (task == null)
        {
            logger.LogWarning("DeleteAsync - Task {Id} does not exist", id);
            return Result.Failure($"The task {id} does not exist.");
        }

        await repository.DeleteAsync(id, userId);

        logger.LogInformation("DeleteAsync - Task {Id} deleted", id);
        return Result.Success();
    }

    private static TaskDto ToDto(TaskItem task) =>
        new(task.Id.ToString(), task.Title, task.CreatedAt);
}
