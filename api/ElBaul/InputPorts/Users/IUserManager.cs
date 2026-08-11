using ElBaul.InputPorts.Users;
using ElBaul.OutputPorts.Users;
using ElBaul.Shared;
namespace ElBaul.InputPorts.Users;
public interface IUserManager
{
    Task<Result<UserProfileDto>> GetCurrentProfileAsync();
    Task<Result<UserProfileDto>> UpdateNotificationPreferencesAsync(bool weeklyDigestEnabled);
    Task<Result<UserProfileDto>> MarkOnboardingSeenAsync();
}
