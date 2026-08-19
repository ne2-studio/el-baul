using ElBaul.Core.Users.Domain;
using ElBaul.Core.Feed.OutputPorts;
using ElBaul.Core.Notifications.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.Users.OutputPorts;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Core.Notifications.Application;
/// <summary>
/// Daily, aggregated, silence-by-default: at most one push per user per day, only sent when
/// there is real family activity (other people's recuerdos/fotos/capítulos) to report since the
/// last time this user was notified. No content-only "no news" or algorithmic nudge push yet —
/// deliberately out of scope for this first slice (see PRODUCT.md's "ship over polish").
///
/// Unlike WeeklyDigestManager, this has no rich per-baúl/per-chapter breakdown: the whole point
/// of a push is a one-line, single-glance summary, so it only needs aggregate counts — which
/// avoids reusing WeeklyDigestManager's block/overflow machinery (built for an email body) for a
/// shape it was never meant to serve.
/// </summary>
public class PushDigestManager(
    ILogger<PushDigestManager> logger,
    IUserRepository userRepository,
    IPushTokenRepository pushTokenRepository,
    IPushNotificationSender pushNotificationSender,
    DigestActivityPolicy digestActivityPolicy,
    IBaulFeedCursorRepository feedCursorRepository,
    IBackgroundJobScheduler backgroundJobScheduler,
    IAppConfiguration appConfiguration,
    IClock clock) : IPushDigestManager
{
    // Matches the recurring job's own cadence (Program.cs schedules it once a day) — this is
    // just the fallback window for a user who has never been sent a digest before, and the
    // re-entrancy guard against the scheduler firing again before a day has passed.
    private static readonly TimeSpan DigestInterval = TimeSpan.FromDays(1);

    public async Task ScheduleDailyPushDigestsAsync()
    {
        if (!appConfiguration.PushDigestEnabled)
        {
            logger.LogInformation("PushDigestDisabled skipping schedule");
            return;
        }

        var userIds = (await pushTokenRepository.GetUserIdsWithTokensAsync()).ToList();
        if (userIds.Count == 0) return;

        var users = await userRepository.GetByIdsAsync(userIds);
        var now = clock.UtcNow();

        foreach (var user in users)
        {
            var lastSent = user.LastPushDigestSentAt;
            if (lastSent is not null && now - lastSent < DigestInterval)
                continue;

            var since = lastSent ?? now - DigestInterval;
            backgroundJobScheduler.EnqueuePushDigest(user.Id, since);
            logger.LogInformation("PushDigestScheduled {UserId} {Since}", user.Id, since);
        }
    }

    public async Task SendPushDigestAsync(UserId userId, DateTime since)
    {
        if (!appConfiguration.PushDigestEnabled)
        {
            logger.LogInformation("PushDigestSkipped feature disabled");
            return;
        }

        var user = await userRepository.GetByIdAsync(userId);
        if (user is null)
        {
            logger.LogWarning("PushDigestSkipped user not found");
            return;
        }

        var tokens = (await pushTokenRepository.GetTokensForUserAsync(userId)).ToList();
        if (tokens.Count == 0)
        {
            logger.LogInformation("PushDigestSkipped no registered device");
            return;
        }

        var summary = await BuildSummaryAsync(user, since);
        if (summary is null)
        {
            // Silence is a valid outcome, not a failure — the cursor deliberately stays put so
            // tomorrow's `since` still covers everything back to the last real send.
            logger.LogInformation("PushDigestSkipped no activity since {Since}", since);
            return;
        }

        var anySucceeded = false;
        foreach (var token in tokens)
        {
            var message = new PushNotificationMessage(token.Token, summary.Title, summary.Body, summary.DeepLink);
            var result = await pushNotificationSender.SendAsync(message);
            if (result.IsSuccess)
                anySucceeded = true;
            else
                logger.LogWarning("PushDigestSendFailed {Error}", result.Error);
        }

        if (!anySucceeded) return;

        await userRepository.UpdateLastPushDigestSentAtAsync(userId, clock.UtcNow());
        logger.LogInformation("PushDigestSent");
    }

    private async Task<PushDigestSummary?> BuildSummaryAsync(User user, DateTime since)
    {
        // One query for every baúl this user has a seen-cursor for, not one per baúl — see
        // IBaulFeedCursorRepository.GetAllForUserAsync's doc comment.
        var cursors = await feedCursorRepository.GetAllForUserAsync(user.Id);
        var activity = await digestActivityPolicy.CollectAsync(
            user, since, baulId => cursors.TryGetValue(baulId, out var seenAt) ? seenAt : DateTime.MinValue);
        if (!activity.HasActivity) return null;

        var parts = new List<string>();
        if (activity.TotalRecuerdos > 0)
            parts.Add(activity.TotalRecuerdos == 1 ? "1 recuerdo nuevo" : $"{activity.TotalRecuerdos} recuerdos nuevos");
        if (activity.TotalPhotos > 0)
            parts.Add(activity.TotalPhotos == 1 ? "1 foto nueva" : $"{activity.TotalPhotos} fotos nuevas");
        if (activity.TotalChapters > 0)
            parts.Add(activity.TotalChapters == 1 ? "1 capítulo nuevo" : $"{activity.TotalChapters} capítulos nuevos");

        var title = activity.ActiveBaules.Count == 1 ? "Hay novedades en tu baúl" : "Hay novedades en tus baúles";
        var body = JoinSpanishList(parts);
        // Only deep-link straight to the feed when exactly one baúl has news — with several,
        // the app's own "opens in the last used baúl" default is a reasonable landing spot.
        var deepLink = activity.ActiveBaules.Count == 1 ? $"/baules/{activity.ActiveBaules[0].Baul.Id}" : null;

        return new PushDigestSummary(title, body, deepLink);
    }

    private static string JoinSpanishList(IReadOnlyList<string> parts) => parts.Count switch
    {
        0 => "",
        1 => parts[0],
        _ => string.Join(", ", parts.Take(parts.Count - 1)) + " y " + parts[^1]
    };

    private record PushDigestSummary(string Title, string Body, string? DeepLink);
}
