using ElBaul.OutputPorts.Photos;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// Finds photos with no recorded dimensions yet (Width == 0 — the default for rows created
/// before this ticket) and fills Width/Height/SizeBytes in by inspecting the copy already
/// sitting in object storage with the exact same IImageProcessor.IdentifyAsync the upload path
/// uses. Never touches the stored image itself — this is metadata-only, a prerequisite for
/// backfill-normalize-photos (which needs accurate Width/Height to find its candidates).
///
/// Idempotent by construction: only rows with Width == 0 are ever selected, so a re-run only
/// retries photos a previous run failed to identify. Supports --limit N to cap how many rows a
/// single run processes.
/// </summary>
[MaintenanceCommand("backfill-photo-metadata")]
public class BackfillPhotoMetadataCommand(
    IPhotoRepository photoRepository,
    IPhotoStorage photoStorage,
    IImageProcessor imageProcessor,
    MaintenanceCommandArguments arguments,
    ILogger<BackfillPhotoMetadataCommand> logger) : IMaintenanceCommand
{
    public async Task<int> RunAsync(bool dryRun)
    {
        var limit = arguments.TryGetInt("--limit");
        var candidates = (await photoRepository.GetMissingDimensionsAsync()).ToList();
        var photos = limit is { } l ? candidates.Take(l).ToList() : candidates;

        logger.LogInformation(
            "backfill-photo-metadata: {Total} photo(s) missing dimensions, processing {Count}{DryRunSuffix}",
            candidates.Count, photos.Count, dryRun ? " (dry run — no changes will be saved)" : "");

        var updated = 0;
        var failed = 0;

        foreach (var photo in photos)
        {
            try
            {
                await using var content = await photoStorage.OpenReadAsync(photo.StorageKey);
                var sizeBytes = content.Length;

                var metadata = await imageProcessor.IdentifyAsync(content);
                if (metadata is null)
                {
                    failed++;
                    logger.LogError(
                        "Photo {PhotoId} ({StorageKey}): stored object could not be identified as a valid image, leaving it as-is",
                        photo.Id, photo.StorageKey);
                    continue;
                }

                logger.LogInformation(
                    "Photo {PhotoId}: found {Width}x{Height}, {SizeBytes} bytes",
                    photo.Id, metadata.Width, metadata.Height, sizeBytes);

                if (!dryRun)
                {
                    await photoRepository.UpdateAsync(photo.WithMetadata(metadata.Width, metadata.Height, sizeBytes));
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
            "backfill-photo-metadata done. Updated: {Updated}, failed: {Failed}{DryRunSuffix}",
            updated, failed, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }
}
