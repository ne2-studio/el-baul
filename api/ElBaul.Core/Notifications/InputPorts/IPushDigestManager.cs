using ElBaul.Domain;
namespace ElBaul.Core.Notifications.InputPorts;
/// <summary>
/// One push per user per day, at most, and only when there is something to report — see
/// PushDigestManager for the aggregation/silence rules. Same scheduler/per-user-job split as
/// IWeeklyDigestManager, for the same reason (per-user retry isolation via Hangfire).
/// </summary>
public interface IPushDigestManager
{
    /// <summary>Recurring-job entry point: finds users with a registered device and due for a
    /// check, and enqueues one job per user.</summary>
    Task ScheduleDailyPushDigestsAsync();

    /// <summary>Per-user job, invoked by the scheduler above via Hangfire. `since` is the
    /// activity window's start. Sends nothing (and leaves the cursor untouched) if there's no
    /// activity to report.</summary>
    Task SendPushDigestAsync(UserId userId, DateTime since);
}
