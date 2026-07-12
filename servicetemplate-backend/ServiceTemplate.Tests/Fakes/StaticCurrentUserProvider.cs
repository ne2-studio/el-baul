using ServiceTemplate.Ports.Output;

namespace ServiceTemplate.Tests.Fakes;

public class StaticCurrentUserProvider(string userId) : ICurrentUserProvider
{
    public string GetUserId()
    {
        return userId;
    }
}
