using System.Security.Cryptography;
using System.Text.RegularExpressions;
using ElBaul.Core.Photos.Application;
using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Domain;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// One-off historical cleanup: finds every group of PhotoAsset rows that represent the exact same
/// binary content and consolidates each into a single canonical row (docs/.backlog issue #64,
/// Slice 4 of the PhotoAsset extraction work).
///
/// Why this can't just GROUP BY OriginalContentHash: migration
/// 20260913154323_AddUserPhotoAssetsAndGlobalContentHash found pre-existing PhotoAssets sharing a
/// hash and, rather than merging them there and then, kept every row and nulled the hash on all
/// but the oldest in each colliding group — see that migration's own comment. So today's DB state
/// has *at most one* row per real historical hash still carrying it; every other historical
/// duplicate looks identical to a genuinely pre-hash legacy asset (OriginalContentHash IS NULL).
/// This command recomputes the same SHA-256 content hash PhotoFileService.BufferAndHashAsync uses
/// for uploads — from the stored bytes, once per distinct StorageKey — for every null-hash asset,
/// then groups by that recomputed value (joined with whatever already-trustworthy non-null hashes
/// exist). This is the same hash definition the upload pipeline already uses, not a second one.
///
/// An asset whose existing OriginalContentHash column is non-null but not a well-formed 64-char
/// lowercase-hex SHA-256, or whose bytes can't be re-read from storage to compute one, is never
/// guessed at — it's excluded from every group and reported instead (see
/// docs/.backlog issue #64 §1: "fail conservatively and report rather than guessing").
///
/// Canonical selection: oldest CreatedAt, then lowest Id (PhotoAssetMergeService.SelectCanonical)
/// — never Photo/UserPhotoAsset reference count, uploader identity, or query order.
///
/// Merging: PhotoAssetMergeService redirects every Photo/UserPhotoAsset reference onto the
/// canonical asset (resolving any same-baúl Photo conflict through the existing
/// PhotoDuplicateMergeService first) and deletes the now-unreferenced duplicate PhotoAsset rows.
/// This command's own job on top of that is purely storage cleanup: once a duplicate's row is
/// gone, its physical storage object (if distinct from the canonical asset's — some historical
/// duplicates share the very same StorageKey) is deleted via IPhotoStorage, *after* the DB merge
/// for that group has already committed.
///
/// Safe to re-run: a fully consolidated group has only one row left, so it's never seen as a
/// duplicate group again; a group that failed partway (see PhotoAssetMergeService's own two-phase
/// transaction doc comment) is simply retried, picking up wherever it left off. Each group is
/// merged independently and a failed group is logged and skipped rather than aborting the run —
/// see the equivalent rationale on DeduplicatePhotosCommand.
///
/// This is a repair of pre-existing historical data only. Slice 2.5's global exact-duplicate
/// upload dedup (PhotoUploadWorkflow, IX_PhotoAssets_OriginalContentHash) already prevents new
/// global duplicates from being created — verified while building this command, left untouched.
/// </summary>
[MaintenanceCommand("deduplicate-photo-assets")]
public class DeduplicatePhotoAssetsCommand(
    IPhotoRepository photoRepository,
    IPhotoStorage photoStorage,
    PhotoAssetMergeService photoAssetMergeService,
    MaintenanceCommandArguments arguments,
    ILogger<DeduplicatePhotoAssetsCommand> logger) : IMaintenanceCommand
{
    // Lowercase hex-encoded SHA-256 is always exactly 64 characters — mirrors
    // PhotoAssetConfiguration's own column comment.
    private static readonly Regex TrustworthyHashPattern = new("^[0-9a-f]{64}$", RegexOptions.Compiled);

    public async Task<int> RunAsync(bool dryRun)
    {
        var limit = arguments.TryGetInt("--limit");
        var hashFilter = arguments.TryGetString("--hash");
        var assetIdFilter = arguments.TryGetString("--asset-id");

        var allAssets = await photoRepository.GetAllAssetsAsync();
        var (groups, hashFailures) = await FindDuplicateGroupsAsync(allAssets);

        if (hashFilter is not null)
            groups = groups.Where(g => g.Hash == hashFilter).ToList();
        if (assetIdFilter is not null && PhotoAssetId.Parse(assetIdFilter) is { IsSuccess: true, Value: var filterAssetId })
            groups = groups.Where(g => g.Assets.Any(a => a.Id == filterAssetId)).ToList();
        if (limit is { } take)
            groups = groups.Take(take).ToList();

        logger.LogInformation(
            "deduplicate-photo-assets: {Scanned} PhotoAsset(s) scanned, {GroupCount} duplicate group(s), " +
            "{DuplicateCount} duplicate PhotoAsset row(s) that would be consolidated, {HashFailureCount} asset(s) " +
            "with an untrustworthy or unrecoverable content hash (never merged){DryRunSuffix}",
            allAssets.Count, groups.Count, groups.Sum(g => g.Assets.Count - 1), hashFailures.Count,
            dryRun ? " (dry run — no changes will be saved)" : "");

        foreach (var failure in hashFailures)
            logger.LogWarning("[skip] PhotoAsset {PhotoAssetId}: {Reason}", failure.AssetId, failure.Reason);

        var merged = 0;
        var failed = 0;
        var photosRedirected = 0;
        var relationsRedirected = 0;
        var assetsDeleted = 0;
        var storageObjectsDeleted = 0;
        var sameBaulConflictsResolved = 0;

        foreach (var group in groups)
        {
            // BuildPreviewAsync is read-only, but it's still wrapped in the same per-group
            // try/catch as the merge itself: a transient read failure here (e.g. a Photo row
            // referencing a duplicate asset disappearing mid-run) must skip and report this one
            // group, not abort the whole run — same "keep going" guarantee as the merge below.
            try
            {
                var preview = await BuildPreviewAsync(group);

                if (dryRun)
                {
                    logger.LogInformation(
                        "[dry run] hash {Hash}: {GroupSize} PhotoAsset(s), canonical={CanonicalId}, would delete " +
                        "{DuplicateIds}, would redirect {PhotoCount} Photo row(s) ({BaulConflictCount} same-baúl " +
                        "conflict(s) to resolve first) and {RelationCount} UserPhotoAsset row(s), would delete " +
                        "storage key(s) {StorageKeys}",
                        group.Hash, group.Assets.Count, preview.Canonical.Id,
                        string.Join(",", preview.Duplicates.Select(d => d.Id)), preview.PhotosToRedirect.Count,
                        preview.SameBaulConflicts.Count, preview.UserRelationsToRedirect.Count,
                        string.Join(",", preview.StorageKeysEligibleForCleanup));
                    continue;
                }

                var result = await photoAssetMergeService.MergeGroupAsync(group.Assets, group.Hash);

                var deletedKeysThisGroup = new HashSet<string>();
                foreach (var duplicate in result.Duplicates)
                {
                    if (duplicate.StorageKey == result.Canonical.StorageKey) continue; // Case A: same object, nothing to delete.
                    if (!deletedKeysThisGroup.Add(duplicate.StorageKey)) continue; // Two duplicates sharing one key.

                    try
                    {
                        await photoStorage.DeleteAsync(duplicate.StorageKey);
                        storageObjectsDeleted++;
                    }
                    catch (Exception ex)
                    {
                        // The PhotoAsset row is already gone (DB merge committed) — only the
                        // physical object failed to clean up. Logged, not retried automatically:
                        // an orphaned blob with no referencing row is a storage cost, not a
                        // correctness problem, and re-running this command won't find it again.
                        logger.LogError(ex,
                            "Duplicate PhotoAsset {PhotoAssetId} row deleted but its storage object {StorageKey} " +
                            "could not be cleaned up — needs manual follow-up", duplicate.Id, duplicate.StorageKey);
                    }
                }

                merged++;
                photosRedirected += preview.PhotosToRedirect.Count;
                relationsRedirected += preview.UserRelationsToRedirect.Count;
                assetsDeleted += result.Duplicates.Count;
                sameBaulConflictsResolved += result.SameBaulPhotoMerges.Count;

                logger.LogInformation(
                    "Duplicate group merged: hash {Hash}, canonical={CanonicalId}, deleted {DuplicateIds}, " +
                    "redirected {PhotoCount} Photo row(s) and {RelationCount} UserPhotoAsset row(s), resolved " +
                    "{BaulConflictCount} same-baúl conflict(s)",
                    group.Hash, result.Canonical.Id, string.Join(",", result.Duplicates.Select(d => d.Id)),
                    preview.PhotosToRedirect.Count, preview.UserRelationsToRedirect.Count, result.SameBaulPhotoMerges.Count);
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogError(ex,
                    "Duplicate group merge failed: hash {Hash}, candidates={AssetIds} — group skipped, no partial " +
                    "changes were left behind (see PhotoAssetMergeService's transaction boundary)",
                    group.Hash, string.Join(",", group.Assets.Select(a => a.Id)));
            }
        }

        logger.LogInformation(
            "deduplicate-photo-assets done. Groups merged: {Merged}, failed: {Failed}, PhotoAssets deleted: " +
            "{AssetsDeleted}, storage objects deleted: {StorageDeleted}, Photo rows redirected: {PhotosRedirected}, " +
            "UserPhotoAsset rows redirected: {RelationsRedirected}, same-baúl conflicts resolved: {BaulConflicts}, " +
            "assets with an untrustworthy/unrecoverable hash skipped: {HashFailures}{DryRunSuffix}",
            merged, failed, assetsDeleted, storageObjectsDeleted, photosRedirected, relationsRedirected,
            sameBaulConflictsResolved, hashFailures.Count, dryRun ? " — dry run, nothing was saved" : "");

        return failed > 0 ? 1 : 0;
    }

    private async Task<(List<DuplicateGroup> Groups, List<HashFailure> Failures)> FindDuplicateGroupsAsync(
        IReadOnlyList<PhotoAsset> allAssets)
    {
        var byHash = new Dictionary<string, List<PhotoAsset>>();
        var failures = new List<HashFailure>();

        foreach (var asset in allAssets.Where(a => a.OriginalContentHash is not null))
        {
            if (!TrustworthyHashPattern.IsMatch(asset.OriginalContentHash!))
            {
                failures.Add(new HashFailure(asset.Id, "OriginalContentHash column value is not a well-formed SHA-256 hex digest"));
                continue;
            }

            AddToGroup(byHash, asset.OriginalContentHash!, asset);
        }

        // Recomputed once per distinct StorageKey (never once per asset) — several historical
        // duplicates can share the exact same StorageKey (Case A, see this command's doc
        // comment), and there's no reason to pay for a second storage read/hash of bytes already
        // hashed a moment ago.
        var hashByStorageKey = new Dictionary<string, string>();
        foreach (var asset in allAssets.Where(a => a.OriginalContentHash is null))
        {
            if (!hashByStorageKey.TryGetValue(asset.StorageKey, out var hash))
            {
                try
                {
                    var content = await photoStorage.OpenReadForDownloadAsync(asset.StorageKey);
                    await using (content.Content)
                        hash = Convert.ToHexStringLower(await SHA256.HashDataAsync(content.Content));
                    hashByStorageKey[asset.StorageKey] = hash;
                }
                catch (Exception ex)
                {
                    failures.Add(new HashFailure(
                        asset.Id, $"could not recompute content hash from storage key '{asset.StorageKey}': {ex.Message}"));
                    continue;
                }
            }

            AddToGroup(byHash, hash, asset);
        }

        var groups = byHash.Where(kv => kv.Value.Count > 1).Select(kv => new DuplicateGroup(kv.Key, kv.Value)).ToList();
        return (groups, failures);
    }

    private static void AddToGroup(Dictionary<string, List<PhotoAsset>> byHash, string hash, PhotoAsset asset)
    {
        if (!byHash.TryGetValue(hash, out var list))
            byHash[hash] = list = [];

        list.Add(asset);
    }

    private async Task<GroupPreview> BuildPreviewAsync(DuplicateGroup group)
    {
        var canonical = PhotoAssetMergeService.SelectCanonical(group.Assets);
        var duplicates = group.Assets.Where(a => a.Id != canonical.Id).ToList();
        var duplicateIds = duplicates.Select(d => d.Id).ToHashSet();

        var photos = await photoRepository.GetAllByAssetIdsAsync(group.Assets.Select(a => a.Id));
        var photosToRedirect = photos.Where(p => duplicateIds.Contains(p.PhotoAssetId)).ToList();
        var sameBaulConflicts = photos
            .Where(p => p.Status == PhotoStatus.Active)
            .GroupBy(p => p.BaulId)
            .Where(g => g.Count() > 1)
            .Select(g => g.ToList())
            .ToList();

        var relations = await photoRepository.GetUserPhotoAssetsByAssetIdsAsync(group.Assets.Select(a => a.Id));
        var relationsToRedirect = relations.Where(r => duplicateIds.Contains(r.PhotoAssetId)).ToList();

        var storageKeysEligible = duplicates
            .Select(d => d.StorageKey)
            .Where(k => k != canonical.StorageKey)
            .Distinct()
            .ToList();

        return new GroupPreview(canonical, duplicates, photosToRedirect, sameBaulConflicts, relationsToRedirect, storageKeysEligible);
    }

    private record DuplicateGroup(string Hash, List<PhotoAsset> Assets);

    private record HashFailure(PhotoAssetId AssetId, string Reason);

    private record GroupPreview(
        PhotoAsset Canonical,
        List<PhotoAsset> Duplicates,
        List<Photo> PhotosToRedirect,
        List<List<Photo>> SameBaulConflicts,
        List<UserPhotoAsset> UserRelationsToRedirect,
        List<string> StorageKeysEligibleForCleanup);
}
