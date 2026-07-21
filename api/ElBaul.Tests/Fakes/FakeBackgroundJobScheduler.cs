using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class FakeBackgroundJobScheduler : IBackgroundJobScheduler
{
    public List<string> EnqueuedWelcomeEmailUserIds { get; } = [];
    public List<(string UserId, DateTime Since)> EnqueuedWeeklyDigests { get; } = [];

    public void EnqueueWelcomeEmail(string userId) => EnqueuedWelcomeEmailUserIds.Add(userId);

    public void EnqueueWeeklyDigest(string userId, DateTime since) => EnqueuedWeeklyDigests.Add((userId, since));
}
