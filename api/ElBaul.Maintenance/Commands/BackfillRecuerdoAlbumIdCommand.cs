using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// Recuerdo now carries its own AlbumId (denormalized from Photo.AlbumId) so the Recuerdos
/// feed can query by chapter without joining through Photo. This backfills that AlbumId for
/// every existing recuerdo that already has a PhotoId but no AlbumId yet — newly created
/// recuerdos set it themselves.
/// </summary>
[MaintenanceCommand("backfill-recuerdo-album-id")]
public class BackfillRecuerdoAlbumIdCommand(
    IRecuerdoRepository recuerdoRepository,
    IPhotoRepository photoRepository,
    ILogger<BackfillRecuerdoAlbumIdCommand> logger) : IMaintenanceCommand
{
    public async Task<int> RunAsync(bool dryRun)
    {
        var candidates = (await recuerdoRepository.GetWithPhotoAndNoAlbumAsync()).ToList();
        logger.LogInformation(
            "backfill-recuerdo-album-id: {Count} recuerdo(s) to check{DryRunSuffix}",
            candidates.Count, dryRun ? " (dry run — no changes will be saved)" : "");

        var updated = 0;
        var leftNull = 0;
        var failed = 0;

        foreach (var recuerdo in candidates)
        {
            try
            {
                var photo = await photoRepository.GetByIdAsync(recuerdo.PhotoId!.Value);
                if (photo?.AlbumId is not { } albumId)
                {
                    // Photo missing or loose (no album) — nothing to backfill, leave AlbumId null.
                    leftNull++;
                    continue;
                }

                logger.LogInformation(
                    "Recuerdo {RecuerdoId}: setting AlbumId {AlbumId} from photo {PhotoId}",
                    recuerdo.Id, albumId, recuerdo.PhotoId);

                if (!dryRun)
                {
                    await recuerdoRepository.UpdateAsync(recuerdo with { AlbumId = albumId });
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
            "backfill-recuerdo-album-id done. Updated: {Updated}, left null (loose photo): {LeftNull}, failed: {Failed}{DryRunSuffix}",
            updated, leftNull, failed, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }
}
