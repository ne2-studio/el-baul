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

        return new UserProfileDto(user.Id, user.Email, user.Name, user.CreatedAt);
    }
}
