using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// Recuerdo now carries its own ChapterId (denormalized from Photo.ChapterId) so the Recuerdos
/// feed can query by chapter without joining through Photo. This backfills that ChapterId for
/// every existing recuerdo that already has a PhotoId but no ChapterId yet — newly created
/// recuerdos set it themselves.
/// </summary>
[MaintenanceCommand("backfill-recuerdo-chapter-id")]
public class BackfillRecuerdoChapterIdCommand(
    IRecuerdoRepository recuerdoRepository,
    IPhotoRepository photoRepository,
    ILogger<BackfillRecuerdoChapterIdCommand> logger) : IMaintenanceCommand
{
    public async Task<int> RunAsync(bool dryRun)
    {
        var candidates = (await recuerdoRepository.GetWithPhotoAndNoChapterAsync()).ToList();
        logger.LogInformation(
            "backfill-recuerdo-chapter-id: {Count} recuerdo(s) to check{DryRunSuffix}",
            candidates.Count, dryRun ? " (dry run — no changes will be saved)" : "");

        var updated = 0;
        var leftNull = 0;
        var failed = 0;

        foreach (var recuerdo in candidates)
        {
            try
            {
                var photo = await photoRepository.GetByIdAsync(recuerdo.PhotoId!.Value);
                if (photo?.ChapterId is not { } chapterId)
                {
                    // Photo missing or loose (no chapter) — nothing to backfill, leave ChapterId null.
                    leftNull++;
                    continue;
                }

                logger.LogInformation(
                    "Recuerdo {RecuerdoId}: setting ChapterId {ChapterId} from photo {PhotoId}",
                    recuerdo.Id, chapterId, recuerdo.PhotoId);

                if (!dryRun)
                {
                    await recuerdoRepository.UpdateAsync(recuerdo with { ChapterId = chapterId });
                }

                updated++;
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogError(ex,
                    "Recuerdo {RecuerdoId} ({PhotoId}): backfill failed, leaving it as-is",
                    recuerdo.Id, recuerdo.PhotoId);
            }
        }

        logger.LogInformation(
            "backfill-recuerdo-chapter-id done. Updated: {Updated}, left null (loose photo): {LeftNull}, failed: {Failed}{DryRunSuffix}",
            updated, leftNull, failed, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }
}
