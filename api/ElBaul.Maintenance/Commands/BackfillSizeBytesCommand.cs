using ElBaul.OutputPorts.Photos;
using ElBaul.Shared;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// Finds photos with no recorded size yet (SizeBytes == 0 — rows created before this field
/// existed) and re-derives it from the copy already sitting in object storage. Safe to
/// re-run: any photo that genuinely has SizeBytes == 0 after a run (storage read failed) is
/// picked up again next time.
/// </summary>
[MaintenanceCommand("backfill-size-bytes")]
public class BackfillSizeBytesCommand(
    IPhotoRepository photoRepository,
    IPhotoStorage photoStorage,
    ILogger<BackfillSizeBytesCommand> logger) : IMaintenanceCommand
{
    public async Task<int> RunAsync(bool dryRun)
    {
        var photos = (await photoRepository.GetMissingSizeBytesAsync()).ToList();
        logger.LogInformation(
            "backfill-size-bytes: {Count} photo(s) missing size{DryRunSuffix}",
            photos.Count, dryRun ? " (dry run — no changes will be saved)" : "");

        var updated = 0;
        var failed = 0;

        foreach (var photo in photos)
        {
            try
            {
                await using var content = await photoStorage.OpenReadAsync(photo.StorageKey);
                var sizeBytes = content.Length;

                logger.LogInformation("Photo {PhotoId}: found size {SizeBytes} bytes", photo.Id, sizeBytes);

                if (!dryRun)
                {
                    await photoRepository.UpdateAsync(photo with { SizeBytes = sizeBytes });
                }

                updated++;
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogError(ex,
                    "Photo {PhotoId} ({StorageKey}): backfill failed, leaving it as-is",
                    photo.Id, photo.StorageKey);
            }
        }

        logger.LogInformation(
            "backfill-size-bytes done. Updated: {Updated}, failed: {Failed}{DryRunSuffix}",
            updated, failed, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }
}
