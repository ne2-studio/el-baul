using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// Recuerdo now carries its own BaulId (denormalized from Photo.BaulId/Album.BaulId, or set
/// directly for standalone recuerdos) so the Recuerdos tab can query a whole baúl without
/// joining through Photo/Album. This backfills that BaulId for every existing recuerdo
/// created before that change, resolving it from the recuerdo's PhotoId (photo's BaulId) or
/// AlbumId (album's BaulId) — newly created recuerdos set it themselves.
///
/// Gates a follow-up migration (MakeRecuerdoBaulIdRequired) that makes the column NOT NULL —
/// do not deploy that migration until a --dry-run of this command reports zero remaining
/// candidates.
/// </summary>
[MaintenanceCommand("backfill-recuerdo-baul-id")]
public class BackfillRecuerdoBaulIdCommand(
    IRecuerdoRepository recuerdoRepository,
    IPhotoRepository photoRepository,
    IAlbumRepository albumRepository,
    ILogger<BackfillRecuerdoBaulIdCommand> logger) : IMaintenanceCommand
{
    public async Task<int> RunAsync(bool dryRun)
    {
        var candidates = (await recuerdoRepository.GetCandidatesWithNoBaulIdAsync()).ToList();
        logger.LogInformation(
            "backfill-recuerdo-baul-id: {Count} recuerdo(s) to check{DryRunSuffix}",
            candidates.Count, dryRun ? " (dry run — no changes will be saved)" : "");

        var updated = 0;
        var leftNull = 0;
        var failed = 0;

        foreach (var candidate in candidates)
        {
            try
            {
                Guid? baulId = null;

                if (candidate.PhotoId is { } photoId)
                {
                    var photo = await photoRepository.GetByIdAsync(photoId);
                    baulId = photo?.BaulId;
                }
                else if (candidate.AlbumId is { } albumId)
                {
                    var album = await albumRepository.GetByIdAsync(albumId);
                    baulId = album?.BaulId;
                }

                if (baulId is not { } resolvedBaulId)
                {
                    // Standalone recuerdo (no photo, no album) or its photo/album no longer
                    // exists — nothing to resolve BaulId from, leave it null.
                    leftNull++;
                    continue;
                }

                logger.LogInformation(
                    "Recuerdo {RecuerdoId}: setting BaulId {BaulId}",
                    candidate.Id, resolvedBaulId);

                if (!dryRun)
                {
                    await recuerdoRepository.SetBaulIdAsync(candidate.Id, resolvedBaulId);
                }

                updated++;
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogError(ex,
                    "Recuerdo {RecuerdoId}: backfill failed, leaving it as-is",
                    candidate.Id);
            }
        }

        logger.LogInformation(
            "backfill-recuerdo-baul-id done. Updated: {Updated}, left null (unresolvable): {LeftNull}, failed: {Failed}{DryRunSuffix}",
            updated, leftNull, failed, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }
}
