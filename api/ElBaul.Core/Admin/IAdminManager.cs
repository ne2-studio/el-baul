using ElBaul.Domain;
using Ne2Studio.Common;

namespace ElBaul.Core.Admin;
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
    Task<Result<IEnumerable<AdminSentPushNotificationDto>>> GetSentPushNotificationsAsync();
    Task<Result<IEnumerable<AdminSentPushNotificationDto>>> GetUserSentPushNotificationsAsync(UserId userId);
    Task<Result<AdminChatContextDebugDto>> DebugChatContextAsync(UserId userId, BaulId baulId, string message);
    Task<Result> UnlinkPersonaAsync(BaulId baulId, PersonaId personaId);
}
