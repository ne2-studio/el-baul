using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class FakeBackgroundJobScheduler : IBackgroundJobScheduler
{
    public List<string> EnqueuedWelcomeEmailUserIds { get; } = [];

    public void EnqueueWelcomeEmail(string userId) => EnqueuedWelcomeEmailUserIds.Add(userId);
}
