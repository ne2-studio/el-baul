using ElBaul.Ports.Output;
using Hangfire;

namespace ElBaul.Infra;

public class HangfireBackgroundJobScheduler(IBackgroundJobClient backgroundJobClient) : IBackgroundJobScheduler
{
    // Enqueues EmailJobs (Infra), not IWelcomeEmailManager/IWeeklyDigestManager (Core) directly
    // — see EmailJobs.cs for why: that's where [DisableConcurrentExecution] actually lives.
    public void EnqueueWelcomeEmail(string userId) =>
        backgroundJobClient.Enqueue<EmailJobs>(j => j.SendWelcomeEmailAsync(userId));

    public void EnqueueWeeklyDigest(string userId, DateTime since) =>
        backgroundJobClient.Enqueue<EmailJobs>(j => j.SendWeeklyDigestAsync(userId, since));
}
