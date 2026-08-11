using ElBaul.Shared;
namespace ElBaul.Tests.Fakes;

public class StaticCurrentUserProvider(string userId, string? accessToken = null) : ICurrentUserProvider
{
    public string GetUserId() => userId;
    public string? GetAccessToken() => accessToken;
}
