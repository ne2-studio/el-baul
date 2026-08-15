using Ne2Studio.Common;
namespace ElBaul.Core.Users;
public interface IUserManager
{
    Task<Result<UserProfileDto>> GetCurrentProfileAsync();
    Task<Result<UserProfileDto>> UpdateNotificationPreferencesAsync(bool weeklyDigestEnabled);
    Task<Result<UserProfileDto>> MarkOnboardingSeenAsync();
}
