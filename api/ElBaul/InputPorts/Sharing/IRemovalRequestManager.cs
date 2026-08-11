using ElBaul.InputPorts.Sharing;
using ElBaul.Shared;

namespace ElBaul.InputPorts.Sharing;
public interface IRemovalRequestManager
{
    Task<Result<IEnumerable<RemovalRequestDto>>> GetRemovalRequestsAsync(BaulId baulId);
    Task<Result<RemovalRequestDto>> CreateRemovalRequestAsync(BaulId baulId, PhotoId photoId, string? reason);
    Task<Result> ApproveRemovalRequestAsync(BaulId baulId, RemovalRequestId requestId);
    Task<Result> RejectRemovalRequestAsync(BaulId baulId, RemovalRequestId requestId);
}
