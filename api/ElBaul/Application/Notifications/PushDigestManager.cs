using ElBaul.Application.Notifications;
using ElBaul.InputPorts.Notifications;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Notifications;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Users;
using ElBaul.Shared;

using Microsoft.Extensions.Logging;

namespace ElBaul.Application.Notifications;
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
    IBaulRepository baulRepository,
    IChapterRepository chapterRepository,
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
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
        var baules = (await baulRepository.GetAccessibleByUserIdAsync(user.Id)).ToList();

        var activeBaules = new List<Baul>();
        var totalChapters = 0;
        var totalRecuerdos = 0;
        var totalPhotos = 0;

        foreach (var baul in baules)
        {
            var chapters = (await chapterRepository.GetCreatedSinceAsync(baul.Id, since, user.Id)).Count();
            var recuerdos = (await recuerdoRepository.GetCreatedSinceByBaulIdAsync(baul.Id, since, user.Id)).Count();
            var photos = (await photoRepository.GetCreatedSinceByBaulIdAsync(baul.Id, since, user.Id)).Count();
            if (chapters + recuerdos + photos == 0) continue;

            activeBaules.Add(baul);
            totalChapters += chapters;
            totalRecuerdos += recuerdos;
            totalPhotos += photos;
        }

        if (activeBaules.Count == 0) return null;

        var parts = new List<string>();
        if (totalRecuerdos > 0) parts.Add(totalRecuerdos == 1 ? "1 recuerdo nuevo" : $"{totalRecuerdos} recuerdos nuevos");
        if (totalPhotos > 0) parts.Add(totalPhotos == 1 ? "1 foto nueva" : $"{totalPhotos} fotos nuevas");
        if (totalChapters > 0) parts.Add(totalChapters == 1 ? "1 capítulo nuevo" : $"{totalChapters} capítulos nuevos");

        var title = activeBaules.Count == 1 ? "Hay novedades en tu baúl" : "Hay novedades en tus baúles";
        var body = JoinSpanishList(parts);
        // Only deep-link straight to the feed when exactly one baúl has news — with several,
        // the app's own "opens in the last used baúl" default is a reasonable landing spot.
        var deepLink = activeBaules.Count == 1 ? $"/baules/{activeBaules[0].Id}" : null;

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
