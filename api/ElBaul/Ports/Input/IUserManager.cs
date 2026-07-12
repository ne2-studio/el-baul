using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface IUserManager
{
    Task<Result<UserProfileDto>> GetCurrentProfileAsync();
}
