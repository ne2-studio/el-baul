using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// Captions used to be the only way to add text to a photo; recuerdos replaced that. This
/// finds every active photo with a non-empty caption, creates a recuerdo from it (authored by
/// the photo's uploader, dated at the time the command runs — the original caption carries no
/// timestamp of its own to preserve), and clears the photo's caption.
/// </summary>
[MaintenanceCommand("migrate-photo-captions-to-recuerdos")]
public class MigratePhotoCaptionsToRecuerdosCommand(
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
    IIdGenerator idGenerator,
    IClock clock,
    ILogger<MigratePhotoCaptionsToRecuerdosCommand> logger) : IMaintenanceCommand
{
    public async Task<int> RunAsync(bool dryRun)
    {
        var photos = (await photoRepository.GetWithCaptionAsync()).ToList();
        logger.LogInformation(
            "migrate-photo-captions-to-recuerdos: {Count} photo(s) with a caption to migrate{DryRunSuffix}",
            photos.Count, dryRun ? " (dry run — no changes will be saved)" : "");

        var migrated = 0;
        var failed = 0;

        foreach (var photo in photos)
        {
            try
            {
                logger.LogInformation(
                    "Photo {PhotoId}: converting caption to a recuerdo authored by {UploadedBy}",
                    photo.Id, photo.UploadedBy);

                if (!dryRun)
                {
                    var recuerdo = new Recuerdo(
                        idGenerator.NewId(),
                        photo.Id,
                        photo.AlbumId,
                        photo.BaulId,
                        photo.UploadedBy,
                        photo.Caption!,
                        clock.UtcNow());
                    await recuerdoRepository.CreateAsync(recuerdo);
                    await photoRepository.UpdateAsync(photo with { Caption = null });
                }

                migrated++;
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogError(ex,
                    "Photo {PhotoId}: caption migration failed, leaving it as-is",
                    photo.Id);
            }
        }

        logger.LogInformation(
            "migrate-photo-captions-to-recuerdos done. Migrated: {Migrated}, failed: {Failed}{DryRunSuffix}",
            migrated, failed, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }
}
