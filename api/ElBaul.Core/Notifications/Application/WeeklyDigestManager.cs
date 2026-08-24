using ElBaul.Core.Users.Domain;
using ElBaul.Core.Notifications.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.Users.OutputPorts;
using Ne2Studio.Common;

using Microsoft.Extensions.Logging;

using ElBaul.Domain;
using ElBaul.Core.Notifications.Domain;
namespace ElBaul.Core.Notifications.Application;
public class WeeklyDigestManager(
    ILogger<WeeklyDigestManager> logger,
    IUserRepository userRepository,
    DigestActivityPolicy digestActivityPolicy,
    DigestAttributionResolver attributionResolver,
    ISentEmailRepository sentEmailRepository,
    IEmailTemplateRenderer templateRenderer,
    EmailDeliveryCoordinator deliveryCoordinator,
    IBackgroundJobScheduler backgroundJobScheduler,
    IAppConfiguration appConfiguration,
    ICurrentUserProvider currentUserProvider,
    IClock clock) : IWeeklyDigestManager
{
    private static readonly TimeSpan DigestInterval = TimeSpan.FromDays(7);

    // EmailJobs.SendWeeklyDigestAsync carries [DisableConcurrentExecution], which serializes
    // every per-user send in a batch onto a single worker. As the digest-enabled population
    // grows, a user's SentEmail.SentAt (this eligibility check's `lastSent`) can land minutes —
    // in principle longer — after the nominal Sunday 08:00 UTC tick, purely because of their
    // position in that serialized queue. A strict `>= 7 days` gate anchored to that actual
    // completion time turns any such processing lag into a silent skip the following week (see
    // GitHub #33). This tolerance absorbs that inherent lag without weakening the "roughly once
    // a week" gate: it's an order of magnitude below the 1-day granularity the existing
    // eligibility tests rely on, so genuinely early re-sends are still rejected.
    private static readonly TimeSpan DigestIntervalTolerance = TimeSpan.FromHours(6);

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
                return !hasLastSent || now - lastSent >= DigestInterval - DigestIntervalTolerance;
            },
            user =>
            {
                var since = lastSentByUser.TryGetValue(user.Id, out var lastSent)
                    ? lastSent
                    : now - DigestInterval;
                backgroundJobScheduler.EnqueueWeeklyDigest(user.Id, since);
                logger.LogInformation("WeeklyDigestScheduled {UserId} {Since}", user.Id, since);
            },
            logger,
            "WeeklyDigestNotDue");
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
        var activity = await digestActivityPolicy.CollectAsync(user, since);
        var publicUrl = appConfiguration.PublicUrl.TrimEnd('/');

        var sections = new List<BaulDigestSection>();
        foreach (var baulActivity in activity.ActiveBaules)
        {
            var section = await BuildBaulSection(baulActivity, publicUrl, linkBuilder);
            if (section is not null) sections.Add(section);
        }

        var targetPath = activity.HasBaules ? $"/baules/{activity.AccessibleBaules[0].Id}" : "/baules/nuevo";
        var ctaUrl = linkBuilder.TrackRedirect("primary-cta", publicUrl, targetPath);
        var ctaLabel = activity.HasBaules ? "Añadir un recuerdo" : "Crear mi primer baúl";

        var notificationSettingsUrl = linkBuilder.TrackRedirect("notification-settings", publicUrl, "/configuracion/notificaciones");

        return new WeeklyDigestEmailModel(
            user.Nombre ?? user.Email, activity.HasBaules, activity.HasActivity, sections, ctaUrl, ctaLabel, notificationSettingsUrl,
            EmailFooterLinksFactory.BuildTracked(publicUrl, appConfiguration, clock, linkBuilder),
            linkBuilder.BuildOpenPixelUrl(),
            linkBuilder.BuildLogoUrl());
    }

    private async Task<BaulDigestSection?> BuildBaulSection(
        BaulDigestActivity activity, string publicUrl, TrackedLinkBuilder linkBuilder)
    {
        var baul = activity.Baul;
        var baulUrl = linkBuilder.TrackRedirect(DigestBlockKind.NewRecuerdos.ToString(), publicUrl, $"/baules/{baul.Id}");
        var items = new List<DigestActivityBlock>();

        foreach (var chapter in activity.NewChapters)
        {
            // Always a single creator per chapter, so no "y otros" case here — just name them.
            var chapterAuthor = await attributionResolver.ResolveAsync(
                [new DigestAttributionItem(baul.Id, new UserId(chapter.CreatedByUserId), chapter.CreatedAt)]);
            var label = $"{chapterAuthor!.TopAuthor.Nickname} creó el capítulo “{chapter.Name}”";
            items.Add(new DigestActivityBlock(
                DigestBlockKind.NewChapter, label,
                linkBuilder.TrackRedirect(DigestBlockKind.NewChapter.ToString(), publicUrl, $"/baules/{baul.Id}/capitulos/{chapter.Id}"), 1));
        }

        var recuerdoCount = activity.NewRecuerdoCount;
        if (recuerdoCount > 0)
        {
            var attribution = await attributionResolver.ResolveAsync(
                activity.NewRecuerdos.Select(r => new DigestAttributionItem(baul.Id, r.UserId, r.CreatedAt)).ToList());
            var countLabel = recuerdoCount == 1 ? "1 recuerdo nuevo" : $"{recuerdoCount} recuerdos nuevos";
            var label = $"{AttributionPrefix(attribution!)} {(attribution!.HasOtherContributors ? "añadieron" : "añadió")} {countLabel}";
            items.Add(new DigestActivityBlock(DigestBlockKind.NewRecuerdos, label, baulUrl, recuerdoCount));
        }

        foreach (var chapterActivity in activity.NewPhotosByChapter)
        {
            var chapter = chapterActivity.Chapter;
            var count = chapterActivity.Count;
            var attribution = await attributionResolver.ResolveAsync(
                chapterActivity.Photos.Select(p => new DigestAttributionItem(baul.Id, p.UploadedBy, p.CreatedAt)).ToList());
            var countLabel = count == 1 ? "1 foto nueva" : $"{count} fotos nuevas";
            var label = $"{AttributionPrefix(attribution!)} {(attribution!.HasOtherContributors ? "añadieron" : "añadió")} {countLabel} en “{chapter.Name}”";
            items.Add(new DigestActivityBlock(
                DigestBlockKind.NewPhotosInChapter, label,
                linkBuilder.TrackRedirect(DigestBlockKind.NewPhotosInChapter.ToString(), publicUrl, $"/baules/{baul.Id}/capitulos/{chapter.Id}"), count));
        }

        var looseCount = activity.NewLoosePhotoCount;
        if (looseCount > 0)
        {
            var attribution = await attributionResolver.ResolveAsync(
                activity.NewLoosePhotos.Select(p => new DigestAttributionItem(baul.Id, p.UploadedBy, p.CreatedAt)).ToList());
            var countLabel = looseCount == 1 ? "1 foto nueva" : $"{looseCount} fotos nuevas";
            var label = $"{AttributionPrefix(attribution!)} {(attribution!.HasOtherContributors ? "añadieron" : "añadió")} {countLabel} sin organizar";
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

    // "Tita Loli" when she's the only contributor, "Tita Loli y otros" when others also
    // contributed to this block — no contributor's name is ever omitted (see GitHub #54).
    private static string AttributionPrefix(DigestAttribution attribution) =>
        attribution.HasOtherContributors ? $"{attribution.TopAuthor.Nickname} y otros" : attribution.TopAuthor.Nickname;

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
