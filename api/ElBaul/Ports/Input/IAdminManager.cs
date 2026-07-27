using CSharpFunctionalExtensions;
using ElBaul.Ports.Output;

namespace ElBaul.Ports.Input;

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
}
