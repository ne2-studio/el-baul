using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Microsoft.Extensions.Logging;

namespace ElBaul.Maintenance.Commands;

/// <summary>
/// Finds every canonical PhotoAsset with zero referencing Photo rows (any status) and zero
/// UserPhotoAsset relations — genuinely orphaned, not just temporarily zero-Photo the way a
/// direct Mis fotos upload leaves an asset (that one still has a UserPhotoAsset row, so it's
/// never a candidate here) — and hard-deletes both the storage object and the PhotoAsset row.
///
/// This is the garbage collection the codebase has been expecting since Slice 2's "Add to
/// another baúl" first decoupled PhotoAsset lifetime from Photo lifetime (see
/// IAdminBaulDeletionRepository, PhotoRepository.DeleteAsync/DeleteByBaulIdAsync,
/// UserPhotoAssetConfiguration — all left an intentional orphan with a comment pointing here).
///
/// Only considers assets older than <see cref="GracePeriod"/> to avoid racing an in-flight
/// upload (the PhotoAsset row commits together with its Photo/UserPhotoAsset row in the same
/// transaction — see PhotoUploadWorkflow — so this is a defensive margin, not a correctness
/// requirement).
///
/// Safe to re-run: an asset with any surviving reference is never a candidate, and a deleted
/// asset can't come back. Each asset is deleted independently and a failure (e.g. storage
/// delete error) is logged and skipped rather than aborting the run.
/// </summary>
[MaintenanceCommand("cleanup-orphaned-photo-assets")]
public class CleanupOrphanedPhotoAssetsCommand(
    IPhotoRepository photoRepository,
    IPhotoStorage photoStorage,
    IClock clock,
    ILogger<CleanupOrphanedPhotoAssetsCommand> logger) : IMaintenanceCommand
{
    public static readonly TimeSpan GracePeriod = TimeSpan.FromHours(24);

    public async Task<int> RunAsync(bool dryRun)
    {
        var cutoff = clock.UtcNow() - GracePeriod;
        var orphaned = await photoRepository.GetOrphanedAssetsAsync(cutoff);

        logger.LogInformation(
            "cleanup-orphaned-photo-assets: {OrphanCount} orphaned PhotoAsset(s) found (created before {Cutoff}){DryRunSuffix}",
            orphaned.Count, cutoff, dryRun ? " (dry run — nothing will be deleted)" : "");

        if (dryRun)
        {
            foreach (var asset in orphaned)
            {
                logger.LogInformation(
                    "[dry run] Would delete orphaned PhotoAsset {PhotoAssetId}, storage key {StorageKey}, created {CreatedAt}",
                    asset.Id, asset.StorageKey, asset.CreatedAt);
            }

            return 0;
        }

        var deleted = 0;
        var failed = 0;
        foreach (var asset in orphaned)
        {
            try
            {
                await photoStorage.DeleteAsync(asset.StorageKey);
                await photoRepository.DeleteAssetAsync(asset.Id);
                deleted++;
                logger.LogInformation(
                    "Orphaned PhotoAsset deleted {PhotoAssetId} {StorageKey}", asset.Id, asset.StorageKey);
            }
            catch (Exception ex)
            {
                failed++;
                logger.LogError(ex, "Failed to delete orphaned PhotoAsset {PhotoAssetId} {StorageKey}", asset.Id, asset.StorageKey);
            }
        }

        logger.LogInformation("cleanup-orphaned-photo-assets done. Deleted: {Deleted}, failed: {Failed}", deleted, failed);

        return failed > 0 ? 1 : 0;
    }
}
