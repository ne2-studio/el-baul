using System.Security.Cryptography;
using ElBaul.Application.Photos;
using ElBaul.OutputPorts.Photos;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// Backfills Photo.OriginalContentHash for every photo that doesn't have one yet (rows created
/// before this field existed, or before this command has ever reached them), by hashing the
/// bytes currently sitting in object storage — see PhotoFileService/Photo.OriginalContentHash's
/// own doc comments for why that's necessarily the *currently stored* bytes rather than the
/// original upload bytes for historical photos (previous image-processing/backfill operations
/// may already have transformed them). Not status-filtered: a soft-deleted photo's blob is
/// never removed either, so it's just as hashable, and the uniqueness constraint only ever
/// applies to Active rows anyway (see IX_Photos_BaulId_OriginalContentHash_Active).
///
/// Safe to re-run: a photo that already has a hash is never touched again (no force/rebuild
/// option — none of the existing maintenance commands have one, and this PRD explicitly says
/// not to introduce one solely for this feature), and a photo whose hash write loses the race
/// against an existing active photo with the same hash gets merged into it right away instead of
/// being retried and failing forever — see the TrySetContentHashAsync branch below. That merge
/// reuses PhotoDuplicateMergeService, the exact same domain behavior deduplicate-photos uses.
///
/// Deploy-order gate (see docs/.backlog issue #20 §19): must reach zero remaining candidates,
/// and deduplicate-photos must report zero remaining active duplicate groups, before
/// IX_Photos_BaulId_OriginalContentHash_Active is safe to treat as fully enforcing — it already
/// exists from the first migration in this feature (harmless before backfill runs, since every
/// pre-existing photo starts with a null hash, which the partial index ignores) but two active
/// photos that turn out to be duplicates only become visible to deduplicate-photos once both
/// sides of the pair have a hash.
/// </summary>
[MaintenanceCommand("backfill-photo-content-hashes")]
public class BackfillPhotoContentHashesCommand(
    IPhotoRepository photoRepository,
    IPhotoStorage photoStorage,
    PhotoDuplicateMergeService photoDuplicateMergeService,
    ILogger<BackfillPhotoContentHashesCommand> logger) : IMaintenanceCommand
{
    public async Task<int> RunAsync(bool dryRun)
    {
        var candidates = (await photoRepository.GetMissingContentHashAsync()).ToList();
        logger.LogInformation(
            "backfill-photo-content-hashes: {Count} photo(s) with no OriginalContentHash yet{DryRunSuffix}",
            candidates.Count, dryRun ? " (dry run — no changes will be saved)" : "");

        var hashed = 0;
        var merged = 0;
        var failed = 0;

        foreach (var photo in candidates)
        {
            try
            {
                await using var content = await photoStorage.OpenReadAsync(photo.StorageKey);
                var hash = Convert.ToHexStringLower(await SHA256.HashDataAsync(content));

                if (dryRun)
                {
                    hashed++;
                    continue;
                }

                if (await photoRepository.TrySetContentHashAsync(photo.Id, photo.BaulId, hash))
                {
                    hashed++;
                    continue;
                }

                // Only reachable for a currently-Active photo (TrySetContentHashAsync never
                // fails for a Deleted one) — another active photo in this baúl already carries
                // this hash: a pre-existing, previously-unflagged duplicate this backfill just
                // uncovered. Merge it immediately instead of leaving this photo's hash null
                // forever, which would otherwise make it permanently invisible to
                // deduplicate-photos' own group discovery (it only groups by non-null hash).
                var existingActive = await photoRepository.GetActiveByContentHashAsync(photo.BaulId, hash)
                    ?? throw new InvalidOperationException(
                        $"TrySetContentHashAsync reported a hash conflict for photo {photo.Id} but no active duplicate was found.");

                logger.LogInformation(
                    "Photo {PhotoId}: hash matches already-active photo {ExistingPhotoId}, merging as a duplicate group",
                    photo.Id, existingActive.Id);
                await photoDuplicateMergeService.MergeGroupAsync([photo.WithOriginalContentHash(hash), existingActive]);
                merged++;
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogError(ex,
                    "Photo {PhotoId} ({StorageKey}): content hash backfill failed, leaving it as-is",
                    photo.Id, photo.StorageKey);
            }
        }

        logger.LogInformation(
            "backfill-photo-content-hashes done. Hashed: {Hashed}, merged as duplicate: {Merged}, failed: {Failed}{DryRunSuffix}",
            hashed, merged, failed, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }
}
