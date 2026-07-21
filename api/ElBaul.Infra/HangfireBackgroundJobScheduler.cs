using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using Hangfire;

namespace ElBaul.Infra;

public class HangfireBackgroundJobScheduler(IBackgroundJobClient backgroundJobClient) : IBackgroundJobScheduler
{
    public void EnqueueWelcomeEmail(string userId) =>
        backgroundJobClient.Enqueue<IWelcomeEmailManager>(m => m.SendWelcomeEmailAsync(userId));

    public void EnqueueWeeklyDigest(string userId, DateTime since) =>
        backgroundJobClient.Enqueue<IWeeklyDigestManager>(m => m.SendWeeklyDigestAsync(userId, since));
}
