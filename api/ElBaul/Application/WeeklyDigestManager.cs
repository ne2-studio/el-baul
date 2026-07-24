using System.Net.Mail;
using CSharpFunctionalExtensions;
using ElBaul.Ports.Input;
using ElBaul.Ports.Output;
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
            if (blocked.Contains(user.Id) || !IsValidEmail(user.Email))
                continue;

            var hasLastSent = lastSentByUser.TryGetValue(user.Id, out var lastSent);
            if (hasLastSent && now - lastSent < DigestInterval)
                continue;

            var since = hasLastSent ? lastSent : now - DigestInterval;
            backgroundJobScheduler.EnqueueWeeklyDigest(user.Id, since);
            logger.LogInformation("WeeklyDigestScheduled {UserId} {Since}", user.Id, since);
        }
    }

    public async Task SendWeeklyDigestAsync(string userId, DateTime since)
    {
        if (!appConfiguration.WeeklyDigestEmailsEnabled)
        {
            logger.LogInformation("WeeklyDigestSkipped {UserId} feature disabled", userId);
            return;
        }

        var user = await userRepository.GetByIdAsync(userId);
        if (user is null)
        {
            logger.LogWarning("WeeklyDigestSkipped {UserId} user not found", userId);
            return;
        }

        if (!user.WeeklyDigestEnabled)
        {
            logger.LogInformation("WeeklyDigestSkipped {UserId} digest disabled", userId);
            return;
        }

        if (!IsValidEmail(user.Email))
        {
            logger.LogWarning("WeeklyDigestSkipped {UserId} invalid email", userId);
            return;
        }

        var blocked = await sentEmailRepository.GetUserIdsWithBlockedStatusAsync();
        if (blocked.Contains(userId))
        {
            logger.LogInformation("WeeklyDigestSkipped {UserId} blocked by provider", userId);
            return;
        }

        var until = clock.UtcNow();
        var deduplicationKey = $"weekly-digest:{userId}:{since:O}";

        var result = await deliveryCoordinator.SendAsync(
            userId, user.Email, deduplicationKey, EmailType.WeeklyDigest,
            activitySince: since, activityUntil: until,
            renderAsync: async linkBuilder =>
            {
                var model = await BuildModelAsync(user, since);
                LogGenerated(userId, model);
                return templateRenderer.RenderWeeklyDigest(ApplyTracking(model, linkBuilder));
            });

        if (result.IsFailure)
        {
            // Throwing lets Hangfire's automatic retry pick this back up; the next attempt
            // re-uses the same reserved SentEmail row instead of double-sending.
            throw new InvalidOperationException(result.Error);
        }
    }

    public async Task<Result> SendTestWeeklyDigestAsync(string sourceUserId)
    {
        var user = await userRepository.GetByIdAsync(sourceUserId);
        if (user is null) return Result.Failure("User not found");

        var testRecipient = appConfiguration.AdminTestEmailRecipient;
        if (string.IsNullOrWhiteSpace(testRecipient))
            return Result.Failure("Resend:AdminTestRecipient is not configured");

        var until = clock.UtcNow();
        var lastSent = await sentEmailRepository.GetLatestSentAtAsync(sourceUserId, EmailType.WeeklyDigest);
        var since = lastSent ?? until - DigestInterval;
        var deduplicationKey = $"test-weekly-digest:{sourceUserId}:{Guid.NewGuid()}";

        return await deliveryCoordinator.SendAsync(
            sourceUserId, testRecipient, deduplicationKey, EmailType.TestWeeklyDigest,
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
        var owned = await baulRepository.GetOwnedByUserIdAsync(user.Id);
        var shared = await baulRepository.GetSharedByUserIdAsync(user.Id);
        var baules = owned.Concat(shared.Select(a => a.Baul))
            .DistinctBy(b => b.Id)
            .OrderBy(b => b.Name)
            .ToList();

        var publicUrl = appConfiguration.PublicUrl.TrimEnd('/');

        var sections = new List<BaulDigestSection>();
        foreach (var baul in baules)
        {
            var section = await BuildBaulSectionAsync(baul, since, publicUrl);
            if (section is not null) sections.Add(section);
        }

        var hasBaules = baules.Count > 0;
        var hasActivity = sections.Count > 0;

        var targetPath = hasBaules ? $"/baules/{baules[0].Id}" : "/baules/nuevo";
        var ctaUrl = BuildUrl(publicUrl, targetPath);
        var ctaLabel = hasBaules ? "Añadir un recuerdo" : "Crear mi primer baúl";

        var notificationSettingsUrl = BuildUrl(publicUrl, "/configuracion/notificaciones");

        return new WeeklyDigestEmailModel(
            user.Name ?? user.Email, hasBaules, hasActivity, sections, ctaUrl, ctaLabel, notificationSettingsUrl);
    }

    private async Task<BaulDigestSection?> BuildBaulSectionAsync(Baul baul, DateTime since, string publicUrl)
    {
        var baulUrl = BuildUrl(publicUrl, $"/baules/{baul.Id}");
        var items = new List<DigestActivityBlock>();

        var newChapters = await chapterRepository.GetCreatedSinceAsync(baul.Id, since);
        foreach (var chapter in newChapters)
        {
            items.Add(new DigestActivityBlock(
                DigestBlockKind.NewChapter, $"Nuevo capítulo: “{chapter.Name}”",
                BuildUrl(publicUrl, $"/baules/{baul.Id}/capitulos/{chapter.Id}"), 1));
        }

        var recuerdos = await recuerdoRepository.GetCreatedSinceByBaulIdAsync(baul.Id, since);
        var recuerdoCount = recuerdos.Count();
        if (recuerdoCount > 0)
        {
            var label = recuerdoCount == 1 ? "1 recuerdo nuevo" : $"{recuerdoCount} recuerdos nuevos";
            items.Add(new DigestActivityBlock(DigestBlockKind.NewRecuerdos, label, baulUrl, recuerdoCount));
        }

        var photos = (await photoRepository.GetCreatedSinceByBaulIdAsync(baul.Id, since)).ToList();
        var photosByChapter = photos.Where(p => p.ChapterId is not null).GroupBy(p => p.ChapterId!.Value);
        foreach (var group in photosByChapter.OrderByDescending(g => g.Count()))
        {
            var chapter = await chapterRepository.GetByIdAsync(group.Key);
            if (chapter is null) continue; // chapter deleted since — don't surface stale content

            var count = group.Count();
            var label = count == 1
                ? $"1 foto nueva en “{chapter.Name}”"
                : $"{count} fotos nuevas en “{chapter.Name}”";
            items.Add(new DigestActivityBlock(
                DigestBlockKind.NewPhotosInChapter, label,
                BuildUrl(publicUrl, $"/baules/{baul.Id}/capitulos/{chapter.Id}"), count));
        }

        var looseCount = photos.Count(p => p.ChapterId is null);
        if (looseCount > 0)
        {
            var label = looseCount == 1 ? "1 foto nueva sin organizar" : $"{looseCount} fotos nuevas sin organizar";
            items.Add(new DigestActivityBlock(
                DigestBlockKind.NewLoosePhotos, label, BuildUrl(publicUrl, $"/baules/{baul.Id}/fotos-sueltas"), looseCount));
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

    private static string BuildUrl(string publicUrl, string path) =>
        $"{publicUrl}/?redirectTo={Uri.EscapeDataString(path)}";

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
            Sections = trackedSections
        };
    }

    private static bool IsValidEmail(string email) =>
        !string.IsNullOrWhiteSpace(email) && MailAddress.TryCreate(email, out _);
}
