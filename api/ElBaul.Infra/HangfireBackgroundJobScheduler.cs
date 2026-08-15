using ElBaul.Domain;
using ElBaul.Infra.Emails;
using ElBaul.Infra.Chat;
using ElBaul.Infra.PushNotifications;
using ElBaul.Core.Shared.OutputPorts;
using Hangfire;

namespace ElBaul.Infra;

public class HangfireBackgroundJobScheduler(IBackgroundJobClient backgroundJobClient) : IBackgroundJobScheduler
{
    // Enqueues EmailJobs/PushNotificationJobs (Infra), not IWelcomeEmailManager/
    // IWeeklyDigestManager/IPushDigestManager (Core) directly — see EmailJobs.cs for why:
    // that's where [DisableConcurrentExecution] actually lives.
    public void EnqueueWelcomeEmail(UserId userId) =>
        backgroundJobClient.Enqueue<EmailJobs>(j => j.SendWelcomeEmailAsync(userId));

    public void EnqueueWeeklyDigest(UserId userId, DateTime since) =>
        backgroundJobClient.Enqueue<EmailJobs>(j => j.SendWeeklyDigestAsync(userId, since));

    public void EnqueuePushDigest(UserId userId, DateTime since) =>
        backgroundJobClient.Enqueue<PushNotificationJobs>(j => j.SendPushDigestAsync(userId, since));

    // Primitive parameters (Guid/string), not BaulId/UserId — Hangfire serializes job arguments
    // to JSON for storage, same reasoning as EmailJobs taking a bare userId string instead of
    // UserId.
    public void EnqueueChatMemoryExtraction(BaulId baulId, UserId userId, Guid sourceMessageId, string text) =>
        backgroundJobClient.Enqueue<ChatMemoryExtractionJobs>(j => j.ExtractAsync(baulId.Value, userId.Value, sourceMessageId, text));
}
