using CSharpFunctionalExtensions;

namespace ElBaul.Ports.Input;

public interface IWelcomeEmailManager
{
    /// <summary>Recurring-job entry point: finds eligible users and enqueues one job per user.</summary>
    Task SchedulePendingWelcomeEmailsAsync();

    /// <summary>Per-user job, invoked by the scheduler above via Hangfire.</summary>
    Task SendWelcomeEmailAsync(string userId);

    /// <summary>Admin-triggered test send, using sourceUserId's current data but mailed to the configured admin test recipient.</summary>
    Task<Result> SendTestWelcomeEmailAsync(string sourceUserId);
}
