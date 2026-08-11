using ElBaul.InputPorts.Notifications;
using ElBaul.OutputPorts.Users;
using ElBaul.Shared;

namespace ElBaul.InputPorts.Notifications;
public interface IWeeklyDigestManager
{
    /// <summary>Recurring-job entry point: finds users due for a digest and enqueues one job per user.</summary>
    Task ScheduleWeeklyDigestsAsync();

    /// <summary>Per-user job, invoked by the scheduler above via Hangfire. `since` is the activity window's start.</summary>
    Task SendWeeklyDigestAsync(UserId userId, DateTime since);

    /// <summary>Admin-triggered test send, using sourceUserId's current data but mailed to the configured admin test recipient.</summary>
    Task<Result> SendTestWeeklyDigestAsync(UserId sourceUserId);
}
