namespace ElBaul.Tests.Fakes;

public class FakeUserInfoClient(UserInfo? userInfo = null) : IUserInfoClient
{
    public Task<UserInfo?> GetUserInfoAsync(string accessToken) => Task.FromResult(userInfo);
}
