using ElBaul.Application.Photos;
using ElBaul.OutputPorts.Photos;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// Finds photos whose *recorded* dimensions violate ImagePolicy.MaxStoredLongEdge
/// (IPhotoRepository.GetOversizedAsync — only ever matches rows backfill-photo-metadata has
/// already populated, since a Width == 0 row can never satisfy "> maxLongEdge") and normalizes
/// the stored asset down to the policy, reusing exactly the same ImagePolicy + IImageProcessor
/// the upload pipeline (PhotoFileService) uses — this command must never reinterpret either.
///
/// Per photo, dimensions are re-read off the *actual stored bytes* via IImageProcessor before
/// deciding anything — never trusted from the candidate row alone. This is what makes the
/// command safely idempotent even against a partial previous run: if a prior run replaced the
/// storage object but its own DB update then failed, the row would still look like a candidate
/// here, but the live re-check finds the object already compliant and self-heals the row
/// instead of normalizing (and, worse, re-normalizing an already-normalized asset) again. It is
/// the reason no separate "temp object in storage, verify, then replace" round trip is needed
/// on top of that: NormalizeAsync fully produces and validates the new bytes in memory before
/// IPhotoStorage.SaveAsync ever touches the canonical key, and SaveAsync's PUT-to-the-same-key
/// is what actually replaces the object — atomic from this process's point of view, so nothing
/// here can leave a half-written object behind. The one residual gap — SaveAsync succeeds but
/// the following UpdateAsync throws — leaves the DB row stale (still pointing at the old
/// dimensions) rather than wrong (storage already holds the smaller, valid asset); the
/// self-heal path above corrects it on the very next run.
///
/// Supports --limit N to cap how many candidates a single run processes.
/// </summary>
[MaintenanceCommand("backfill-normalize-photos")]
public class BackfillNormalizePhotosCommand(
    IPhotoRepository photoRepository,
    IPhotoStorage photoStorage,
    IImageProcessor imageProcessor,
    ImagePolicy imagePolicy,
    MaintenanceCommandArguments arguments,
    ILogger<BackfillNormalizePhotosCommand> logger) : IMaintenanceCommand
{
    public async Task<int> RunAsync(bool dryRun)
    {
        var limit = arguments.TryGetInt("--limit");
        var candidates = (await photoRepository.GetOversizedAsync(imagePolicy.MaxStoredLongEdge)).ToList();
        var photos = limit is { } l ? candidates.Take(l).ToList() : candidates;
        var currentBytes = photos.Sum(p => p.SizeBytes);

        logger.LogInformation(
            "backfill-normalize-photos: {Total} photo(s) exceed {MaxLongEdge}px, processing {Count} " +
            "({CurrentBytes} bytes currently stored){DryRunSuffix}",
            candidates.Count, imagePolicy.MaxStoredLongEdge, photos.Count, currentBytes,
            dryRun ? " (dry run — no changes will be saved)" : "");

        if (dryRun)
        {
            foreach (var group in photos.GroupBy(p => $"{p.Width}x{p.Height}").OrderByDescending(g => g.Count()))
            {
                logger.LogInformation("Would normalize {Count} photo(s) at {Resolution}", group.Count(), group.Key);
            }

            return 0;
        }

        var normalized = 0;
        var skipped = 0;
        var failed = 0;
        var bytesBefore = 0L;
        var bytesAfter = 0L;

        foreach (var photo in photos)
        {
            try
            {
                await using var content = await photoStorage.OpenReadAsync(photo.StorageKey);
                var metadata = await imageProcessor.IdentifyAsync(content);
                if (metadata is null)
                {
                    failed++;
                    logger.LogError(
                        "Photo {PhotoId} ({StorageKey}): stored object could not be identified as a valid image, leaving it as-is",
                        photo.Id, photo.StorageKey);
                    continue;
                }

                if (!imagePolicy.NeedsNormalization(metadata.Width, metadata.Height))
                {
                    // The stored asset is already compliant (a previous run normalized it but
                    // may have failed to persist that below) — bring the row in line with
                    // reality instead of re-normalizing an already-normalized asset.
                    skipped++;
                    if (photo.Width != metadata.Width || photo.Height != metadata.Height)
                    {
                        await photoRepository.UpdateAsync(photo.WithMetadata(metadata.Width, metadata.Height, content.Length));
                    }
                    continue;
                }

                content.Position = 0;
                var resized = await imageProcessor.NormalizeAsync(content, imagePolicy.MaxStoredLongEdge);
                if (imagePolicy.NeedsNormalization(resized.Width, resized.Height))
                    throw new InvalidOperationException(
                        $"NormalizeAsync produced {resized.Width}x{resized.Height}, still over {imagePolicy.MaxStoredLongEdge}px");

                await photoStorage.SaveAsync(photo.StorageKey, resized.Content, resized.ContentType);
                await photoRepository.UpdateAsync(photo.Normalized(resized.Width, resized.Height, resized.SizeBytes));

                logger.LogInformation(
                    "Photo {PhotoId}: normalized {FromWidth}x{FromHeight} ({FromBytes} bytes) -> {ToWidth}x{ToHeight} ({ToBytes} bytes)",
                    photo.Id, metadata.Width, metadata.Height, photo.SizeBytes, resized.Width, resized.Height, resized.SizeBytes);

                normalized++;
                bytesBefore += photo.SizeBytes;
                bytesAfter += resized.SizeBytes;
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogError(ex,
                    "Photo {PhotoId} ({StorageKey}): normalization failed, original asset left untouched",
                    photo.Id, photo.StorageKey);
            }
        }

        logger.LogInformation(
            "backfill-normalize-photos done. Normalized: {Normalized}, skipped: {Skipped}, failed: {Failed}, " +
            "bytes before: {BytesBefore}, bytes after: {BytesAfter}, bytes saved: {BytesSaved}",
            normalized, skipped, failed, bytesBefore, bytesAfter, bytesBefore - bytesAfter);

        return failed > 0 ? 1 : 0;
    }
}
