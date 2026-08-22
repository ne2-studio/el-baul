using ElBaul.Core.Analytics.OutputPorts;
namespace ElBaul.Tests.Fakes;

public class InMemoryUserSessionRepository : IUserSessionRepository
{
    public List<UserSessionOpen> Sessions { get; } = [];

    public Task RecordAsync(UserSessionOpen session)
    {
        Sessions.Add(session);
        return Task.CompletedTask;
    }
}
