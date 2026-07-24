using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface IRemovalRequestManager
{
    Task<Result<IEnumerable<RemovalRequestDto>>> GetRemovalRequestsAsync(Guid baulId);
    Task<Result<RemovalRequestDto>> CreateRemovalRequestAsync(Guid baulId, Guid photoId, string? reason);
    Task<Result> ApproveRemovalRequestAsync(Guid baulId, Guid requestId);
    Task<Result> RejectRemovalRequestAsync(Guid baulId, Guid requestId);
}
