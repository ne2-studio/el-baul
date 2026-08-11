using ElBaul.Application.Notifications;
using ElBaul.Application.Bauls;
using ElBaul.InputPorts.Notifications;
using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chapters;
using ElBaul.OutputPorts.Notifications;
using ElBaul.OutputPorts.Photos;
using ElBaul.OutputPorts.Recuerdos;
using ElBaul.OutputPorts.Shared;
using ElBaul.OutputPorts.Users;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
namespace ElBaul.Application.Notifications;
public class WeeklyDigestManager(
    ILogger<WeeklyDigestManager> logger,
    IUserRepository userRepository,
    BaulAccessService baulAccess,
    IChapterRepository chapterRepository,
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
    ISentEmailRepository sentEmailRepository,
    IEmailTemplateRenderer templateRenderer,
    EmailDeliveryCoordinator deliveryCoordinator,
    IBackgroundJobScheduler backgroundJobScheduler,
    IAppConfiguration appConfiguration,
    ICurrentUserProvider currentUserProvider,
    IClock clock) : IWeeklyDigestManager
{
    private static readonly TimeSpan DigestInterval = TimeSpan.FromDays(7);
    private const int MaxBlocksPerBaul = 3;

    public async Task ScheduleWeeklyDigestsAsync()
    {
        if (!appConfiguration.WeeklyDigestEmailsEnabled)
        {
            logger.LogInformation("WeeklyDigestEmailsDisabled skipping schedule");
            return;
        }

        var candidates = await userRepository.GetUsersWithDigestEnabledAsync();
        var lastSentByUser = await sentEmailRepository.GetLatestSentAtByTypeAsync(EmailType.WeeklyDigest);
        var now = clock.UtcNow();

        await deliveryCoordinator.ScheduleEligibleUsersAsync(
            candidates,
            user =>
            {
                var hasLastSent = lastSentByUser.TryGetValue(user.Id, out var lastSent);
                return !hasLastSent || now - lastSent >= DigestInterval;
            },
            user =>
            {
                var since = lastSentByUser.TryGetValue(user.Id, out var lastSent)
                    ? lastSent
                    : now - DigestInterval;
                backgroundJobScheduler.EnqueueWeeklyDigest(user.Id, since);
                logger.LogInformation("WeeklyDigestScheduled {UserId} {Since}", user.Id, since);
            });
    }

    public async Task SendWeeklyDigestAsync(UserId userId, DateTime since)
    {
        await deliveryCoordinator.SendToEligibleUserAsync(
            userId,
            appConfiguration.WeeklyDigestEmailsEnabled,
            logger,
            "WeeklyDigestSkipped",
            EmailType.WeeklyDigest,
            activitySince: since,
            getActivityUntil: () => clock.UtcNow(),
            isEligibleAsync: user =>
            {
                if (user.WeeklyDigestEnabled)
                    return Task.FromResult(true);

                logger.LogInformation("WeeklyDigestSkipped digest disabled");
                return Task.FromResult(false);
            },
            getDeduplicationKey: _ => $"weekly-digest:{userId}:{since:O}",
            renderAsync: async (user, linkBuilder) =>
            {
                var model = await BuildModelAsync(user, since, linkBuilder);
                LogGenerated(model);
                return templateRenderer.RenderWeeklyDigest(model);
            });
    }

    public async Task<Result> SendTestWeeklyDigestAsync(UserId sourceUserId)
    {
        var user = await userRepository.GetByIdAsync(sourceUserId);
        if (user is null) return Result.Failure(ApplicationError.NotFound("User not found"));

        var testRecipient = appConfiguration.AdminTestEmailRecipient;
        if (string.IsNullOrWhiteSpace(testRecipient))
            return Result.Failure(ApplicationError.Validation("Resend:AdminTestRecipient is not configured"));

        var until = clock.UtcNow();
        var lastSent = await sentEmailRepository.GetLatestSentAtAsync(sourceUserId, EmailType.WeeklyDigest);
        var since = lastSent ?? until - DigestInterval;
        var deduplicationKey = $"test-weekly-digest:{sourceUserId}:{Guid.NewGuid()}";
        var adminUserId = currentUserProvider.GetUserId();

        return await deliveryCoordinator.SendAsync(
            adminUserId, testRecipient, deduplicationKey, EmailType.TestWeeklyDigest,
            activitySince: since, activityUntil: until,
            renderAsync: async linkBuilder =>
            {
                var model = await BuildModelAsync(user, since, linkBuilder);
                var rendered = templateRenderer.RenderWeeklyDigest(model);
                return rendered with { Subject = $"[TEST] {rendered.Subject}" };
            });
    }

    private void LogGenerated(WeeklyDigestEmailModel model)
    {
        if (model.HasActivity)
            logger.LogInformation("WeeklyDigestGenerated {SectionCount}", model.Sections.Count);
        else
            logger.LogInformation("WeeklyDigestEmptyGenerated");
    }

    private async Task<WeeklyDigestEmailModel> BuildModelAsync(User user, DateTime since, TrackedLinkBuilder linkBuilder)
    {
        var baules = (await baulAccess.GetAccessibleAsync(user.Id))
            .Select(access => access.Baul)
            .OrderBy(b => b.Name)
            .ToList();

        var publicUrl = appConfiguration.PublicUrl.TrimEnd('/');

        var sections = new List<BaulDigestSection>();
        foreach (var baul in baules)
        {
            var section = await BuildBaulSectionAsync(baul, since, publicUrl, user.Id, linkBuilder);
            if (section is not null) sections.Add(section);
        }

        var hasBaules = baules.Count > 0;
        var hasActivity = sections.Count > 0;

        var targetPath = hasBaules ? $"/baules/{baules[0].Id}" : "/baules/nuevo";
        var ctaUrl = linkBuilder.TrackRedirect("primary-cta", publicUrl, targetPath);
        var ctaLabel = hasBaules ? "Añadir un recuerdo" : "Crear mi primer baúl";

        var notificationSettingsUrl = linkBuilder.TrackRedirect("notification-settings", publicUrl, "/configuracion/notificaciones");

        return new WeeklyDigestEmailModel(
            user.Name ?? user.Email, hasBaules, hasActivity, sections, ctaUrl, ctaLabel, notificationSettingsUrl,
            EmailFooterLinksFactory.BuildTracked(publicUrl, appConfiguration, clock, linkBuilder));
    }

    private async Task<BaulDigestSection?> BuildBaulSectionAsync(
        Baul baul, DateTime since, string publicUrl, UserId excludingUserId, TrackedLinkBuilder linkBuilder)
    {
        var baulUrl = linkBuilder.TrackRedirect(DigestBlockKind.NewRecuerdos.ToString(), publicUrl, $"/baules/{baul.Id}");
        var items = new List<DigestActivityBlock>();

        var newChapters = await chapterRepository.GetCreatedSinceAsync(baul.Id, since, excludingUserId);
        foreach (var chapter in newChapters)
        {
            items.Add(new DigestActivityBlock(
                DigestBlockKind.NewChapter, $"Nuevo capítulo: “{chapter.Name}”",
                linkBuilder.TrackRedirect(DigestBlockKind.NewChapter.ToString(), publicUrl, $"/baules/{baul.Id}/capitulos/{chapter.Id}"), 1));
        }

        var recuerdos = await recuerdoRepository.GetCreatedSinceByBaulIdAsync(baul.Id, since, excludingUserId);
        var recuerdoCount = recuerdos.Count();
        if (recuerdoCount > 0)
        {
            var label = recuerdoCount == 1 ? "1 recuerdo nuevo" : $"{recuerdoCount} recuerdos nuevos";
            items.Add(new DigestActivityBlock(DigestBlockKind.NewRecuerdos, label, baulUrl, recuerdoCount));
        }

        var photos = (await photoRepository.GetCreatedSinceByBaulIdAsync(baul.Id, since, excludingUserId)).ToList();
        var photosByChapter = photos.Where(p => p.ChapterId is not null).GroupBy(p => p.ChapterId!.Value).ToList();

        // One GetByBaulIdAsync for every chapter this baúl has instead of one GetByIdAsync per
        // chapter-with-new-photos — this method already runs once per baúl per digest, so a
        // second per-chapter round trip inside it is an N+1 within an N+1 at digest-sending
        // scale (every eligible user, every week).
        var chaptersById = photosByChapter.Count == 0
            ? new Dictionary<ChapterId, Chapter>()
            : (await chapterRepository.GetByBaulIdAsync(baul.Id)).ToDictionary(c => c.Id);
        foreach (var group in photosByChapter.OrderByDescending(g => g.Count()))
        {
            if (!chaptersById.TryGetValue(group.Key, out var chapter)) continue; // chapter deleted since — don't surface stale content

            var count = group.Count();
            var label = count == 1
                ? $"1 foto nueva en “{chapter.Name}”"
                : $"{count} fotos nuevas en “{chapter.Name}”";
            items.Add(new DigestActivityBlock(
                DigestBlockKind.NewPhotosInChapter, label,
                linkBuilder.TrackRedirect(DigestBlockKind.NewPhotosInChapter.ToString(), publicUrl, $"/baules/{baul.Id}/capitulos/{chapter.Id}"), count));
        }

        var looseCount = photos.Count(p => p.ChapterId is null);
        if (looseCount > 0)
        {
            var label = looseCount == 1 ? "1 foto nueva sin organizar" : $"{looseCount} fotos nuevas sin organizar";
            items.Add(new DigestActivityBlock(
                DigestBlockKind.NewLoosePhotos, label,
                linkBuilder.TrackRedirect(DigestBlockKind.NewLoosePhotos.ToString(), publicUrl, $"/baules/{baul.Id}/fotos-sueltas"), looseCount));
        }

        if (items.Count == 0) return null;

        var ordered = items.OrderBy(i => (int)i.Kind).ThenByDescending(i => i.Count).ToList();
        var shown = ordered.Take(MaxBlocksPerBaul).ToList();
        var overflow = ordered.Skip(MaxBlocksPerBaul).ToList();

        return new BaulDigestSection(baul.Name, baulUrl, shown, BuildOverflowSummary(overflow));
    }

    private static string? BuildOverflowSummary(IReadOnlyList<DigestActivityBlock> overflow)
    {
        if (overflow.Count == 0) return null;

        var photoKinds = new[] { DigestBlockKind.NewPhotosInChapter, DigestBlockKind.NewLoosePhotos };
        if (overflow.All(i => photoKinds.Contains(i.Kind)))
        {
            var totalPhotos = overflow.Sum(i => i.Count);
            var chapterCount = overflow.Count(i => i.Kind == DigestBlockKind.NewPhotosInChapter);
            return chapterCount > 0
                ? $"Y {totalPhotos} fotos nuevas en {chapterCount} capítulo{(chapterCount == 1 ? "" : "s")} más."
                : $"Y {totalPhotos} fotos nuevas más.";
        }

        return overflow.Count == 1 ? "Y 1 novedad más." : $"Y {overflow.Count} novedades más.";
    }
}
