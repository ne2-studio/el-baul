using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using ElBaul.Ports.Shared;
using Hangfire;
using Serilog.Context;

namespace ElBaul.Infra.PushNotifications;

/// <summary>
/// The actual Hangfire-invoked entry point for the per-user push-digest job — same reason
/// EmailJobs exists one level below IWeeklyDigestManager: Core never references Hangfire, so
/// [DisableConcurrentExecution] has to live in a thin Infra wrapper instead. Its lock resource
/// is derived from (Type, Method), so at most one push-digest send is in flight at a time
/// instead of every user's job firing at once.
///
/// Also this job's own log correlation boundary — see EmailJobs' equivalent doc comment.
/// </summary>
public class PushNotificationJobs(IPushDigestManager pushDigestManager)
{
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    public async Task SendPushDigestAsync(string userId, DateTime since)
    {
        using (LogContext.PushProperty("UserId", userId))
            await pushDigestManager.SendPushDigestAsync(new UserId(userId), since);
    }
}
