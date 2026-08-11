using ElBaul.OutputPorts.Photos;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// Historical photos have no UploadBatchId (the field didn't exist yet), so they can't power a
/// baúl feed "upload batch" card without a one-off reconstruction. Groups active photos with no
/// UploadBatchId by a heuristic — same (BaulId, ChapterId, UploadedBy), consecutive uploads no
/// more than 5 minutes apart — and assigns a fresh Guid per group. Approximate by nature (there
/// is no ground truth for what counted as "one upload action" before this field existed), but
/// good enough for the feed to show something rather than nothing for old uploads. Safe to
/// re-run: only touches photos still missing an UploadBatchId.
/// </summary>
[MaintenanceCommand("backfill-upload-batch-id")]
public class BackfillUploadBatchIdCommand(
    IPhotoRepository photoRepository, ILogger<BackfillUploadBatchIdCommand> logger) : IMaintenanceCommand
{
    private static readonly TimeSpan MaxGapWithinBatch = TimeSpan.FromMinutes(5);

    public async Task<int> RunAsync(bool dryRun)
    {
        // Already ordered by BaulId/ChapterId/UploadedBy/CreatedAt — exactly the order this
        // command groups by, so a single forward pass is enough.
        var photos = (await photoRepository.GetMissingUploadBatchIdAsync()).ToList();
        logger.LogInformation(
            "backfill-upload-batch-id: {Count} photo(s) missing a batch{DryRunSuffix}",
            photos.Count, dryRun ? " (dry run — no changes will be saved)" : "");

        var updated = 0;
        var failed = 0;
        var batchCount = 0;

        Photo? previous = null;
        Guid currentBatchId = Guid.Empty;

        foreach (var photo in photos)
        {
            var startsNewBatch = previous is null
                || previous.BaulId != photo.BaulId
                || previous.ChapterId != photo.ChapterId
                || previous.UploadedBy != photo.UploadedBy
                || photo.CreatedAt - previous.CreatedAt > MaxGapWithinBatch;

            if (startsNewBatch)
            {
                currentBatchId = Guid.NewGuid();
                batchCount++;
            }

            try
            {
                if (!dryRun)
                {
                    await photoRepository.UpdateAsync(photo with { UploadBatchId = currentBatchId });
                }

                updated++;
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogError(ex, "Photo {PhotoId}: backfill-upload-batch-id failed, leaving it as-is", photo.Id);
            }

            previous = photo;
        }

        logger.LogInformation(
            "backfill-upload-batch-id done. Updated: {Updated}, failed: {Failed}, batches: {BatchCount}{DryRunSuffix}",
            updated, failed, batchCount, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }
}
