using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface IAdminManager
{
    Task<Result<AdminDashboardCountsDto>> GetDashboardCountsAsync();
    Task<Result<IEnumerable<AdminUserListItemDto>>> GetAllUsersAsync();
    Task<Result<AdminUserDetailDto>> GetUserDetailAsync(string userId);
    Task<Result<IEnumerable<AdminBaulListItemDto>>> GetAllBaulesAsync();
    Task<Result<AdminBaulDetailDto>> GetBaulDetailAsync(Guid baulId);
}
