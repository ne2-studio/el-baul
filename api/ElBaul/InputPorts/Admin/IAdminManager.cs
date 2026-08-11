using ElBaul.InputPorts.Admin;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Users;
using ElBaul.Shared;

namespace ElBaul.InputPorts.Admin;
public interface IAdminManager
{
    Task<Result<AdminDashboardCountsDto>> GetDashboardCountsAsync();
    Task<Result<IEnumerable<AdminUserListItemDto>>> GetAllUsersAsync();
    Task<Result<AdminUserDetailDto>> GetUserDetailAsync(UserId userId);
    Task<Result<IEnumerable<AdminBaulListItemDto>>> GetAllBaulesAsync();
    Task<Result<AdminBaulDetailDto>> GetBaulDetailAsync(BaulId baulId);
    Task<Result> DeleteBaulAsync(BaulId baulId);
    Task<Result<IEnumerable<AdminSentEmailDto>>> GetSentEmailsAsync();
    Task<Result<IEnumerable<AdminSentEmailDto>>> GetUserSentEmailsAsync(UserId userId);
    Task<Result<AdminChatContextDebugDto>> DebugChatContextAsync(UserId userId, BaulId baulId, string message);
}
