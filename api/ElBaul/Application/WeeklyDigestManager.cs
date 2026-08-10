using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
using ElBaul.Ports.Shared;
using Microsoft.Extensions.Logging;

namespace ElBaul.Application;

public class WeeklyDigestManager(
    ILogger<WeeklyDigestManager> logger,
    IUserRepository userRepository,
    IBaulRepository baulRepository,
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
        var blocked = await sentEmailRepository.GetUserIdsWithBlockedStatusAsync();
        var now = clock.UtcNow();

        foreach (var user in candidates)
        {
            if (blocked.Contains(user.Id) || !EmailAddress.TryCreate(user.Email, out _))
                continue;

            var hasLastSent = lastSentByUser.TryGetValue(user.Id, out var lastSent);
            if (hasLastSent && now - lastSent < DigestInterval)
                continue;

            var since = hasLastSent ? lastSent : now - DigestInterval;
            backgroundJobScheduler.EnqueueWeeklyDigest(user.Id, since);
            logger.LogInformation("WeeklyDigestScheduled {UserId} {Since}", user.Id, since);
        }
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

                logger.LogInformation("WeeklyDigestSkipped {UserId} digest disabled", userId);
                return Task.FromResult(false);
            },
            getDeduplicationKey: _ => $"weekly-digest:{userId}:{since:O}",
            renderAsync: async (user, linkBuilder) =>
            {
                var model = await BuildModelAsync(user, since);
                LogGenerated(userId, model);
                return templateRenderer.RenderWeeklyDigest(ApplyTracking(model, linkBuilder));
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
                var model = await BuildModelAsync(user, since);
                var rendered = templateRenderer.RenderWeeklyDigest(ApplyTracking(model, linkBuilder));
                return rendered with { Subject = $"[TEST] {rendered.Subject}" };
            });
    }

    private void LogGenerated(string userId, WeeklyDigestEmailModel model)
    {
        if (model.HasActivity)
            logger.LogInformation("WeeklyDigestGenerated {UserId} {SectionCount}", userId, model.Sections.Count);
        else
            logger.LogInformation("WeeklyDigestEmptyGenerated {UserId}", userId);
    }

    private async Task<WeeklyDigestEmailModel> BuildModelAsync(User user, DateTime since)
    {
        var baules = (await baulRepository.GetAccessibleByUserIdAsync(user.Id))
            .OrderBy(b => b.Name)
            .ToList();

        var publicUrl = appConfiguration.PublicUrl.TrimEnd('/');

        var sections = new List<BaulDigestSection>();
        foreach (var baul in baules)
        {
            var section = await BuildBaulSectionAsync(baul, since, publicUrl, user.Id);
            if (section is not null) sections.Add(section);
        }

        var hasBaules = baules.Count > 0;
        var hasActivity = sections.Count > 0;

        var targetPath = hasBaules ? $"/baules/{baules[0].Id}" : "/baules/nuevo";
        var ctaUrl = EmailDeliveryCoordinator.BuildRedirectUrl(publicUrl, targetPath);
        var ctaLabel = hasBaules ? "Añadir un recuerdo" : "Crear mi primer baúl";

        var notificationSettingsUrl = EmailDeliveryCoordinator.BuildRedirectUrl(publicUrl, "/configuracion/notificaciones");

        return new WeeklyDigestEmailModel(
            user.Name ?? user.Email, hasBaules, hasActivity, sections, ctaUrl, ctaLabel, notificationSettingsUrl,
            EmailFooterLinksFactory.Build(publicUrl, appConfiguration, clock));
    }

    private async Task<BaulDigestSection?> BuildBaulSectionAsync(Baul baul, DateTime since, string publicUrl, string excludingUserId)
    {
        var baulUrl = EmailDeliveryCoordinator.BuildRedirectUrl(publicUrl, $"/baules/{baul.Id}");
        var items = new List<DigestActivityBlock>();

        var newChapters = await chapterRepository.GetCreatedSinceAsync(baul.Id, since, excludingUserId);
        foreach (var chapter in newChapters)
        {
            items.Add(new DigestActivityBlock(
                DigestBlockKind.NewChapter, $"Nuevo capítulo: “{chapter.Name}”",
                EmailDeliveryCoordinator.BuildRedirectUrl(publicUrl, $"/baules/{baul.Id}/capitulos/{chapter.Id}"), 1));
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
                EmailDeliveryCoordinator.BuildRedirectUrl(publicUrl, $"/baules/{baul.Id}/capitulos/{chapter.Id}"), count));
        }

        var looseCount = photos.Count(p => p.ChapterId is null);
        if (looseCount > 0)
        {
            var label = looseCount == 1 ? "1 foto nueva sin organizar" : $"{looseCount} fotos nuevas sin organizar";
            items.Add(new DigestActivityBlock(
                DigestBlockKind.NewLoosePhotos, label,
                EmailDeliveryCoordinator.BuildRedirectUrl(publicUrl, $"/baules/{baul.Id}/fotos-sueltas"), looseCount));
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

    private static WeeklyDigestEmailModel ApplyTracking(WeeklyDigestEmailModel model, TrackedLinkBuilder linkBuilder)
    {
        var trackedSections = model.Sections.Select(section =>
        {
            var trackedBlocks = section.Blocks
                .Select(block => block with { DeepLinkUrl = linkBuilder.Track(block.Kind.ToString(), block.DeepLinkUrl) })
                .ToList();
            return section with { Blocks = trackedBlocks };
        }).ToList();

        return model with
        {
            PrimaryCtaUrl = linkBuilder.Track("primary-cta", model.PrimaryCtaUrl),
            NotificationSettingsUrl = linkBuilder.Track("notification-settings", model.NotificationSettingsUrl),
            Sections = trackedSections,
            Footer = EmailFooterLinksFactory.Track(model.Footer, linkBuilder)
        };
    }
}
