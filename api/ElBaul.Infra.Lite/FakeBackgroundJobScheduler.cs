using ElBaul.Ports.Output;

namespace ElBaul.Infra.Lite;

public class FakeBackgroundJobScheduler : IBackgroundJobScheduler
{
    private readonly Lock _lock = new();

    public List<string> EnqueuedWelcomeEmailUserIds { get; } = [];
    public List<(string UserId, DateTime Since)> EnqueuedWeeklyDigests { get; } = [];

    // Registered as a Singleton in el-baul-api-lite (see ServiceRegistration), so unlike its
    // use in ElBaul.Tests, this can be hit by genuinely concurrent requests — a bare List.Add
    // is not safe under concurrent writers.
    public void EnqueueWelcomeEmail(string userId)
    {
        lock (_lock) EnqueuedWelcomeEmailUserIds.Add(userId);
    }

    public void EnqueueWeeklyDigest(string userId, DateTime since)
    {
        lock (_lock) EnqueuedWeeklyDigests.Add((userId, since));
    }
}
