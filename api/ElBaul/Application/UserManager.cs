using CSharpFunctionalExtensions;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;

namespace ElBaul.Application;

public class UserManager(
    IUserRepository userRepository,
    ICurrentUserProvider currentUserProvider) : IUserManager
{
    public async Task<Result<UserProfileDto>> GetCurrentProfileAsync()
    {
        var userId = currentUserProvider.GetUserId();
        var user = await userRepository.GetByIdAsync(userId);
        if (user is null) return Result.Failure<UserProfileDto>("User not found");

        return ToDto(user);
    }

    public async Task<Result<UserProfileDto>> UpdateNotificationPreferencesAsync(bool weeklyDigestEnabled)
    {
        var userId = currentUserProvider.GetUserId();
        var user = await userRepository.GetByIdAsync(userId);
        if (user is null) return Result.Failure<UserProfileDto>("User not found");

        await userRepository.UpdateWeeklyDigestEnabledAsync(userId, weeklyDigestEnabled);
        return ToDto(user with { WeeklyDigestEnabled = weeklyDigestEnabled });
    }

    private static UserProfileDto ToDto(User user) =>
        new(user.Id, user.Email, user.Name, user.CreatedAt, user.WeeklyDigestEnabled);
}
