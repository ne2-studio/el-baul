using ElBaul.Ports.Output;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// Finds photos with no date (DateYear is null — either uploaded before EXIF extraction
/// existed, or genuinely EXIF-less) and retries EXIF extraction against the copy already
/// sitting in object storage, using the exact same IPhotoDateExtractor the upload path uses.
/// </summary>
[MaintenanceCommand("backfill-exif-dates")]
public class BackfillExifDatesCommand(
    IPhotoRepository photoRepository,
    IPhotoStorage photoStorage,
    IPhotoDateExtractor dateExtractor,
    ILogger<BackfillExifDatesCommand> logger) : IMaintenanceCommand
{
    public async Task<int> RunAsync(bool dryRun)
    {
        var undatedPhotos = (await photoRepository.GetUndatedAsync()).ToList();
        logger.LogInformation(
            "backfill-exif-dates: {Count} undated photo(s) to check{DryRunSuffix}",
            undatedPhotos.Count, dryRun ? " (dry run — no changes will be saved)" : "");

        var updated = 0;
        var stillUndated = 0;
        var failed = 0;

        foreach (var photo in undatedPhotos)
        {
            try
            {
                await using var content = await photoStorage.OpenReadAsync(photo.StorageKey);
                var extracted = dateExtractor.TryExtractDate(content);

                if (extracted is not { } date)
                {
                    stillUndated++;
                    continue;
                }

                logger.LogInformation(
                    "Photo {PhotoId}: found EXIF date {Year:D4}-{Month:D2}-{Day:D2}",
                    photo.Id, date.Year, date.Month, date.Day);

                if (!dryRun)
                {
                    await photoRepository.UpdateAsync(photo with
                    {
                        DateYear = date.Year,
                        DateMonth = date.Month,
                        DateDay = date.Day
                    });
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
            "backfill-exif-dates done. Updated: {Updated}, no EXIF found: {StillUndated}, failed: {Failed}{DryRunSuffix}",
            updated, stillUndated, failed, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }
}
