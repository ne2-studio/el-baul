using ElBaul.Domain;
using ElBaul.Infra.Emails;
using ElBaul.Infra.PushNotifications;
using ElBaul.OutputPorts.Shared;
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
}
