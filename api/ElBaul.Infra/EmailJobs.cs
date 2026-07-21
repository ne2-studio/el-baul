using ElBaul.Ports.Input;
using Hangfire;

namespace ElBaul.Infra;

/// <summary>
/// The actual Hangfire-invoked entry points for per-user email jobs — HangfireBackgroundJobScheduler
/// enqueues these instead of the IWelcomeEmailManager/IWeeklyDigestManager methods directly.
/// [DisableConcurrentExecution] is a Hangfire attribute, and Core (ElBaul.csproj) deliberately
/// never references Hangfire — the same reason IBackgroundJobScheduler exists as a port in the
/// first place — so this thin wrapper is where the attribute actually lives, one level below.
/// Its lock resource is derived from (Type, Method), so it serializes each job type
/// independently: at most one welcome-email send and one digest send in flight at a time,
/// instead of all of them firing at once and tripping Resend's rate limit.
/// </summary>
public class EmailJobs(IWelcomeEmailManager welcomeEmailManager, IWeeklyDigestManager weeklyDigestManager)
{
    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    public Task SendWelcomeEmailAsync(string userId) =>
        welcomeEmailManager.SendWelcomeEmailAsync(userId);

    [DisableConcurrentExecution(timeoutInSeconds: 300)]
    public Task SendWeeklyDigestAsync(string userId, DateTime since) =>
        weeklyDigestManager.SendWeeklyDigestAsync(userId, since);
}
