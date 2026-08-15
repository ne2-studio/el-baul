using ElBaul.Core.Photos.Application;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// Finds every active exact-duplicate group (same BaulId + OriginalContentHash, at least two
/// active photos — see the domain definition in docs/.backlog issue #20 §1) and merges each one
/// through PhotoDuplicateMergeService: picks the oldest-dated photo as survivor, transfers
/// memories/tagged people/cover and share-link references onto it, then soft-deletes every other
/// member with DeletionReason=FlaggedAsDuplicate. Groups with a null hash are never
/// considered.
///
/// Safe to re-run: a soft-deleted duplicate never resurfaces (GetActiveWithContentHashAsync is
/// Active-only), so a second run over an already-clean baúl finds zero groups and changes
/// nothing. Each group is merged in its own transaction (see PhotoDuplicateMergeService) and a
/// failed group is logged and skipped rather than aborting the run — a problem with one baúl's
/// duplicates must never block every other baúl's from being cleaned up.
///
/// Deploy-order gate (see docs/.backlog issue #20 §19): must report zero remaining active
/// duplicate groups (run with --dry-run to verify) before relying on
/// IX_Photos_BaulId_OriginalContentHash_Active as the sole ongoing protection against duplicates
/// re-accumulating — the constraint itself is already active from the first migration in this
/// feature, this is about confirming the *historical* backlog has actually been cleared.
/// </summary>
[MaintenanceCommand("deduplicate-photos")]
public class DeduplicatePhotosCommand(
    IPhotoRepository photoRepository,
    IRecuerdoRepository recuerdoRepository,
    IPhotoPersonaTagRepository photoPersonaTagRepository,
    PhotoDuplicateMergeService photoDuplicateMergeService,
    ILogger<DeduplicatePhotosCommand> logger) : IMaintenanceCommand
{
    public async Task<int> RunAsync(bool dryRun)
    {
        var activeHashed = (await photoRepository.GetActiveWithContentHashAsync()).ToList();
        var groups = activeHashed
            .GroupBy(p => (p.BaulId, Hash: p.OriginalContentHash!))
            .Where(g => g.Count() > 1)
            .Select(g => g.ToList())
            .ToList();

        logger.LogInformation(
            "deduplicate-photos: {PhotosConsidered} active photo(s) with a hash, {GroupCount} duplicate group(s), " +
            "{DuplicateCount} duplicate photo(s) that would be soft-deleted{DryRunSuffix}",
            activeHashed.Count, groups.Count, groups.Sum(g => g.Count - 1),
            dryRun ? " (dry run — no changes will be saved)" : "");

        var merged = 0;
        var failed = 0;

        foreach (var group in groups)
        {
            var survivor = PhotoDuplicateMergeService.SelectSurvivor(group);
            var duplicates = group.Where(p => p.Id != survivor.Id).ToList();
            var duplicateIds = duplicates.Select(d => d.Id).ToList();

            if (dryRun)
            {
                var recuerdoCount = (await recuerdoRepository.GetByPhotoIdsAsync(duplicateIds)).Count();
                var taggedPersonaCount = (await photoPersonaTagRepository.GetPersonaIdsByPhotoIdsAsync(duplicateIds))
                    .Values.SelectMany(personaIds => personaIds).Distinct().Count();
                logger.LogInformation(
                    "[dry run] Baúl {BaulId}, hash {Hash}: {GroupSize} photo(s), survivor={SurvivorId}, " +
                    "would soft-delete {DuplicateIds}, would transfer {RecuerdoCount} memory/comment(s) and " +
                    "up to {TaggedPersonaCount} distinct tagged persona(s) onto the survivor",
                    survivor.BaulId, survivor.OriginalContentHash, group.Count, survivor.Id,
                    string.Join(",", duplicateIds), recuerdoCount, taggedPersonaCount);
                continue;
            }

            try
            {
                var result = await photoDuplicateMergeService.MergeGroupAsync(group);
                merged++;
                logger.LogInformation(
                    "Duplicate group merged: baúl {BaulId}, hash {Hash}, survivor={SurvivorId}, soft-deleted {DuplicateIds}",
                    result.Survivor.BaulId, result.Survivor.OriginalContentHash, result.Survivor.Id,
                    string.Join(",", result.Duplicates.Select(d => d.Id)));
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogError(ex,
                    "Duplicate group merge failed: baúl {BaulId}, hash {Hash}, candidates={PhotoIds}",
                    survivor.BaulId, survivor.OriginalContentHash, string.Join(",", group.Select(p => p.Id)));
            }
        }

        logger.LogInformation(
            "deduplicate-photos done. Groups merged: {Merged}, failed: {Failed}{DryRunSuffix}",
            merged, failed, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }
}
