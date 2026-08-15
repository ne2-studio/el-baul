using ElBaul.Domain;
namespace ElBaul.Core.Shared.OutputPorts;
/// <summary>
/// Fan-out for per-user background work (Hangfire in Infra). Kept as its own port so the
/// Application layer stays free of a direct Hangfire dependency, same as every other
/// external system.
/// </summary>
public interface IBackgroundJobScheduler
{
    void EnqueueWelcomeEmail(UserId userId);
    void EnqueueWeeklyDigest(UserId userId, DateTime since);
    void EnqueuePushDigest(UserId userId, DateTime since);

    /// <summary>Fires memory extraction for a single user chat message off the request that
    /// sends it — see ChatManager.SendMessageAsync and ChatMemoryExtractionManager.</summary>
    void EnqueueChatMemoryExtraction(BaulId baulId, UserId userId, Guid sourceMessageId, string text);
}
