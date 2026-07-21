namespace ElBaul.Ports.Output;

/// <summary>
/// Fan-out for per-user background work (Hangfire in Infra). Kept as its own port so the
/// Application layer stays free of a direct Hangfire dependency, same as every other
/// external system.
/// </summary>
public interface IBackgroundJobScheduler
{
    void EnqueueWelcomeEmail(string userId);
    void EnqueueWeeklyDigest(string userId, DateTime since);
}
