using CSharpFunctionalExtensions;

namespace ServiceTemplate.Ports.Input;

public interface ITaskManager
{
    /// <summary>
    /// Creates a new task with the given title.
    /// </summary>
    /// <param name="title">The title of the task.</param>
    /// <returns>A result containing the created task.</returns>
    Task<Result<TaskDto>> CreateAsync(string title);

    /// <summary>
    /// Lists tasks with pagination support.
    /// </summary>
    /// <param name="skip">The number of items to skip (for pagination).</param>
    /// <param name="take">The maximum number of items to return (for pagination).</param>
    /// <returns>A result containing a collection of tasks.</returns>
    Task<Result<IEnumerable<TaskDto>>> ListAsync(int skip = 0, int take = 10);

    /// <summary>
    /// Deletes a task identified by its id.
    /// </summary>
    /// <param name="id">The unique identifier for the task to delete.</param>
    /// <returns>A result indicating success or an error message if the id does not exist.</returns>
    Task<Result> DeleteAsync(Guid id);
}
