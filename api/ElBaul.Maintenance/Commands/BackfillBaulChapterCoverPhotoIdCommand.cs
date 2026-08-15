using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// Baul/Chapter covers used to be referenced by CoverPhotoKey (a plain storage-key string, no
/// FK) and now are referenced by CoverPhotoId (a real Photo FK, same shape as
/// Persona.AvatarPhotoId) — see Baul.CoverPhotoKey/Chapter.CoverPhotoKey's doc comments. This
/// backfills CoverPhotoId for every baúl/chapter created before that change, resolving it by
/// matching CoverPhotoKey against the storage key of an active photo in the same baúl. Safe to
/// re-run: only touches rows still missing CoverPhotoId. CoverPhotoKey itself is left untouched
/// — it's read-only legacy data now, this command is its only remaining reader.
/// </summary>
[MaintenanceCommand("backfill-baul-chapter-cover-photo-id")]
public class BackfillBaulChapterCoverPhotoIdCommand(
    IBaulRepository baulRepository,
    IChapterRepository chapterRepository,
    IPhotoRepository photoRepository,
    ILogger<BackfillBaulChapterCoverPhotoIdCommand> logger) : IMaintenanceCommand
{
    public async Task<int> RunAsync(bool dryRun)
    {
        var baules = (await baulRepository.GetWithLegacyCoverPhotoKeyAsync()).ToList();
        var chapters = (await chapterRepository.GetWithLegacyCoverPhotoKeyAsync()).ToList();
        logger.LogInformation(
            "backfill-baul-chapter-cover-photo-id: {BaulCount} baul(es), {ChapterCount} chapter(s) to check{DryRunSuffix}",
            baules.Count, chapters.Count, dryRun ? " (dry run — no changes will be saved)" : "");

        var updated = 0;
        var unresolved = 0;

        foreach (var baul in baules)
        {
            // Active photos only: a cover pointing at a soft-deleted or otherwise gone photo is
            // exactly the "no cover" state CoverPhotoId=null already represents.
            var activePhotos = await photoRepository.GetActiveByBaulIdAsync(baul.Id);
            var match = activePhotos.FirstOrDefault(p => p.StorageKey == baul.CoverPhotoKey);
            if (match is null)
            {
                unresolved++;
                continue;
            }

            logger.LogInformation("Baul {BaulId}: setting CoverPhotoId {PhotoId}", baul.Id, match.Id);
            if (!dryRun) await baulRepository.SetCoverPhotoIdAsync(baul.Id, match.Id);
            updated++;
        }

        foreach (var chapter in chapters)
        {
            var activePhotos = await photoRepository.GetActiveByBaulIdAsync(chapter.BaulId);
            var match = activePhotos.FirstOrDefault(p => p.StorageKey == chapter.CoverPhotoKey);
            if (match is null)
            {
                unresolved++;
                continue;
            }

            logger.LogInformation("Chapter {ChapterId}: setting CoverPhotoId {PhotoId}", chapter.Id, match.Id);
            if (!dryRun) await chapterRepository.SetCoverPhotoIdAsync(chapter.Id, match.Id);
            updated++;
        }

        logger.LogInformation(
            "backfill-baul-chapter-cover-photo-id done. Updated: {Updated}, unresolved (no matching active photo): {Unresolved}{DryRunSuffix}",
            updated, unresolved, dryRun ? " — dry run, nothing was saved" : "");

        return 0;
    }
}
