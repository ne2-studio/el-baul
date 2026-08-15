using ElBaul.InputPorts.Notifications;

using Hangfire;
using Serilog.Context;

using ElBaul.Domain;
namespace ElBaul.Infra.Emails;

/// <summary>
/// The actual Hangfire-invoked entry points for per-user email jobs — HangfireBackgroundJobScheduler
/// enqueues these instead of the IWelcomeEmailManager/IWeeklyDigestManager methods directly.
/// [DisableConcurrentExecution] is a Hangfire attribute, and Core (ElBaul.Core.csproj) deliberately
/// never references Hangfire — the same reason IBackgroundJobScheduler exists as a port in the
/// first place — so this thin wrapper is where the attribute actually lives, one level below.
/// Its lock resource is derived from (Type, Method), so it serializes each job type
/// independently: at most one welcome-email send and one digest send in flight at a time,
/// instead of all of them firing at once and tripping Resend's rate limit.
///
/// Also this job type's own log correlation boundary — the background-job equivalent of
/// UserLogContextMiddleware, since a Hangfire job has no HTTP request for that middleware to run
/// against. Every log line for the rest of the job, including from downstream collaborators,
/// carries {UserId} without WelcomeEmailManager/WeeklyDigestManager threading it through by hand.
/// </summary>
public class EmailJobs(IWelcomeEmailManager welcomeEmailManager, IWeeklyDigestManager weeklyDigestManager)
{
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    public async Task SendWelcomeEmailAsync(string userId)
    {
        using (LogContext.PushProperty("UserId", userId))
            await welcomeEmailManager.SendWelcomeEmailAsync(new UserId(userId));
    }

    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    public async Task SendWeeklyDigestAsync(string userId, DateTime since)
    {
        using (LogContext.PushProperty("UserId", userId))
            await weeklyDigestManager.SendWeeklyDigestAsync(new UserId(userId), since);
    }
}
