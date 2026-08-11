using ElBaul.InputPorts.Users;
using Ne2Studio.Common;
namespace ElBaul.InputPorts.Users;
public interface IUserManager
{
    Task<Result<UserProfileDto>> GetCurrentProfileAsync();
    Task<Result<UserProfileDto>> UpdateNotificationPreferencesAsync(bool weeklyDigestEnabled);
    Task<Result<UserProfileDto>> MarkOnboardingSeenAsync();
}
