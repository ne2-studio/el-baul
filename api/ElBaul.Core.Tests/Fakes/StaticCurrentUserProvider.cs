using ElBaul.Domain;
using ElBaul.Core.Shared.OutputPorts;
namespace ElBaul.Tests.Fakes;

public class StaticCurrentUserProvider(string userId) : ICurrentUserProvider
{
    public UserId GetUserId() => new(userId);
}
