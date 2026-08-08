using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using Hangfire;

namespace ElBaul.Infra.PushNotifications;

/// <summary>
/// The actual Hangfire-invoked entry point for the per-user push-digest job — same reason
/// EmailJobs exists one level below IWeeklyDigestManager: Core never references Hangfire, so
/// [DisableConcurrentExecution] has to live in a thin Infra wrapper instead. Its lock resource
/// is derived from (Type, Method), so at most one push-digest send is in flight at a time
/// instead of every user's job firing at once.
/// </summary>
public class PushNotificationJobs(IPushDigestManager pushDigestManager)
{
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    public Task SendPushDigestAsync(string userId, DateTime since) =>
        pushDigestManager.SendPushDigestAsync(new UserId(userId), since);
}
