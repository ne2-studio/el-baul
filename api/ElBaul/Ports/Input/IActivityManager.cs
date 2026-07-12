using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface IActivityManager
{
    Task<Result<IEnumerable<ActivityDto>>> GetForCurrentUserAsync();
}
