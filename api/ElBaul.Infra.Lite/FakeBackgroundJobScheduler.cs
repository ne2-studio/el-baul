using ElBaul.Domain;
using ElBaul.OutputPorts.Shared;
namespace ElBaul.Infra.Lite;

public class FakeBackgroundJobScheduler : IBackgroundJobScheduler
{
    private readonly Lock _lock = new();

    public List<UserId> EnqueuedWelcomeEmailUserIds { get; } = [];
    public List<(UserId UserId, DateTime Since)> EnqueuedWeeklyDigests { get; } = [];
    public List<(UserId UserId, DateTime Since)> EnqueuedPushDigests { get; } = [];
    public List<(BaulId BaulId, UserId UserId, Guid SourceMessageId, string Text)> EnqueuedChatMemoryExtractions { get; } = [];

    // Registered as a Singleton in el-baul-api-lite (see ServiceRegistration), so unlike its
    // use in ElBaul.Tests, this can be hit by genuinely concurrent requests — a bare List.Add
    // is not safe under concurrent writers.
    public void EnqueueWelcomeEmail(UserId userId)
    {
        lock (_lock) EnqueuedWelcomeEmailUserIds.Add(userId);
    }

    public void EnqueueWeeklyDigest(UserId userId, DateTime since)
    {
        lock (_lock) EnqueuedWeeklyDigests.Add((userId, since));
    }

    public void EnqueuePushDigest(UserId userId, DateTime since)
    {
        lock (_lock) EnqueuedPushDigests.Add((userId, since));
    }

    public void EnqueueChatMemoryExtraction(BaulId baulId, UserId userId, Guid sourceMessageId, string text)
    {
        lock (_lock) EnqueuedChatMemoryExtractions.Add((baulId, userId, sourceMessageId, text));
    }
}
