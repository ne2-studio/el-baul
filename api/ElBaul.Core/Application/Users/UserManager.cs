using ElBaul.InputPorts.Users;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Users;
using Ne2Studio.Common;

namespace ElBaul.Application.Users;
public class UserManager(
    IUserRepository userRepository,
    ICurrentUserProvider currentUserProvider) : IUserManager
{
    public async Task<Result<UserProfileDto>> GetCurrentProfileAsync()
    {
        var userId = currentUserProvider.GetUserId();
        var user = await userRepository.GetByIdAsync(userId);
        if (user is null) return Result.Failure<UserProfileDto>(ApplicationError.NotFound("User not found"));

        return ToDto(user);
    }

    public async Task<Result<UserProfileDto>> UpdateNotificationPreferencesAsync(bool weeklyDigestEnabled)
    {
        var userId = currentUserProvider.GetUserId();
        var user = await userRepository.GetByIdAsync(userId);
        if (user is null) return Result.Failure<UserProfileDto>(ApplicationError.NotFound("User not found"));

        await userRepository.UpdateWeeklyDigestEnabledAsync(userId, weeklyDigestEnabled);
        return ToDto(user.WithWeeklyDigestEnabled(weeklyDigestEnabled));
    }

    public async Task<Result<UserProfileDto>> MarkOnboardingSeenAsync()
    {
        var userId = currentUserProvider.GetUserId();
        var user = await userRepository.GetByIdAsync(userId);
        if (user is null) return Result.Failure<UserProfileDto>(ApplicationError.NotFound("User not found"));

        await userRepository.MarkOnboardingSeenAsync(userId);
        return ToDto(user.WithOnboardingSeen());
    }

    private static UserProfileDto ToDto(User user) =>
        new(user.Id, user.Email, user.Name, user.CreatedAt, user.WeeklyDigestEnabled, user.HasSeenOnboarding);
}
