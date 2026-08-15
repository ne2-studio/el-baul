using ElBaul.Domain;
using ElBaul.Core.Shared.OutputPorts;
namespace ElBaul.Tests.Fakes;

public class StaticCurrentUserProvider(string userId, string? accessToken = null) : ICurrentUserProvider
{
    public UserId GetUserId() => new(userId);
    public string? GetAccessToken() => accessToken;
}
