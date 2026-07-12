using Microsoft.Extensions.Logging.Abstractions;
using ServiceTemplate.Application;
using ServiceTemplate.Ports.Output;
using ServiceTemplate.Tests.Fakes;

namespace ServiceTemplate.Tests;

public class TaskManagerTests
{
    private static readonly Guid GeneratedId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private const string CurrentUserId = "user-1";

    private readonly IIdGenerator idGenerator;
    private readonly ITaskRepository taskRepository;
    private readonly SpyNotifier notifier;
    private readonly IClock clock;
    private readonly ICurrentUserProvider currentUserProvider;

    private readonly TaskManager taskManager;

    public TaskManagerTests()
    {
        idGenerator = new StaticIdGenerator(GeneratedId);
        taskRepository = new InMemoryTaskRepository();
        notifier = new SpyNotifier();
        clock = new StaticClock();
        currentUserProvider = new StaticCurrentUserProvider(CurrentUserId);

        taskManager = new TaskManager(NullLogger<TaskManager>.Instance, taskRepository, idGenerator, notifier, clock, currentUserProvider);
    }

    [Fact]
    public async Task CreateAsync_ShouldSaveTaskAndNotify()
    {
        // Act
        var result = await taskManager.CreateAsync("Buy milk");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(GeneratedId.ToString(), result.Value.Id);
        Assert.Equal("Buy milk", result.Value.Title);
        Assert.Equal(clock.UtcNow(), result.Value.CreatedAt);

        var stored = await taskRepository.LoadByIdAsync(GeneratedId, CurrentUserId);
        Assert.NotNull(stored);
        Assert.Equal("Buy milk", stored.Title);
        Assert.Equal(CurrentUserId, stored.UserId);

        Assert.Single(notifier.NotifiedTasks);
        Assert.Equal(GeneratedId, notifier.NotifiedTasks[0].Id);
    }

    [Fact]
    public async Task ListAsync_ShouldReturnTasks_WhenTasksExist()
    {
        // Arrange
        await taskRepository.SaveAsync(new TaskItem(Guid.NewGuid(), CurrentUserId, "task-1", clock.UtcNow()));
        await taskRepository.SaveAsync(new TaskItem(Guid.NewGuid(), CurrentUserId, "task-2", clock.UtcNow()));

        // Act
        var result = await taskManager.ListAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Count());
    }

    [Fact]
    public async Task ListAsync_ShouldRespectPagination_WhenTasksExist()
    {
        // Arrange
        for (var i = 0; i < 5; i++)
        {
            await taskRepository.SaveAsync(new TaskItem(Guid.NewGuid(), CurrentUserId, $"task-{i}", clock.UtcNow()));
        }

        // Act
        var result = await taskManager.ListAsync(skip: 2, take: 2);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Count());
    }

    [Fact]
    public async Task ListAsync_ShouldNotReturnOtherUsersTasks()
    {
        // Arrange
        await taskRepository.SaveAsync(new TaskItem(Guid.NewGuid(), CurrentUserId, "mine", clock.UtcNow()));
        await taskRepository.SaveAsync(new TaskItem(Guid.NewGuid(), "another-user", "not-mine", clock.UtcNow()));

        // Act
        var result = await taskManager.ListAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Single(result.Value);
        Assert.Equal("mine", result.Value.Single().Title);
    }

    [Fact]
    public async Task DeleteAsync_ShouldRemoveTask_WhenIdExists()
    {
        // Arrange
        await taskRepository.SaveAsync(new TaskItem(GeneratedId, CurrentUserId, "task-a", clock.UtcNow()));

        // Act
        var result = await taskManager.DeleteAsync(GeneratedId);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Null(await taskRepository.LoadByIdAsync(GeneratedId, CurrentUserId));
    }

    [Fact]
    public async Task DeleteAsync_ShouldFail_WhenIdDoesNotExist()
    {
        // Act
        var result = await taskManager.DeleteAsync(GeneratedId);

        // Assert
        Assert.True(result.IsFailure);
        Assert.Equal($"The task {GeneratedId} does not exist.", result.Error);
    }

    [Fact]
    public async Task DeleteAsync_ShouldFail_WhenTaskBelongsToAnotherUser()
    {
        // Arrange
        await taskRepository.SaveAsync(new TaskItem(GeneratedId, "another-user", "task-a", clock.UtcNow()));

        // Act
        var result = await taskManager.DeleteAsync(GeneratedId);

        // Assert
        Assert.True(result.IsFailure);
        Assert.NotNull(await taskRepository.LoadByIdAsync(GeneratedId, "another-user"));
    }
}
