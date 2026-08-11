using ElBaul.Infra.Emails;
using ElBaul.Infra.PushNotifications;
using ElBaul.InputPorts.Notifications;
using ElBaul.OutputPorts.Shared;
using Hangfire;

namespace ElBaul.Infra;

public class HangfireBackgroundJobScheduler(IBackgroundJobClient backgroundJobClient) : IBackgroundJobScheduler
{
    // Enqueues EmailJobs/PushNotificationJobs (Infra), not IWelcomeEmailManager/
    // IWeeklyDigestManager/IPushDigestManager (Core) directly — see EmailJobs.cs for why:
    // that's where [DisableConcurrentExecution] actually lives.
    public void EnqueueWelcomeEmail(string userId) =>
        backgroundJobClient.Enqueue<EmailJobs>(j => j.SendWelcomeEmailAsync(userId));

    public void EnqueueWeeklyDigest(string userId, DateTime since) =>
        backgroundJobClient.Enqueue<EmailJobs>(j => j.SendWeeklyDigestAsync(userId, since));

    public void EnqueuePushDigest(string userId, DateTime since) =>
        backgroundJobClient.Enqueue<PushNotificationJobs>(j => j.SendPushDigestAsync(userId, since));
}
