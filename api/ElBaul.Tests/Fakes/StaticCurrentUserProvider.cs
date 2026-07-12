using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class StaticCurrentUserProvider(string userId) : ICurrentUserProvider
{
    public string GetUserId() => userId;
}
