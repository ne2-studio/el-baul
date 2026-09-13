using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Core.Photos.Application;

/// <summary>
/// Merges one exact-duplicate group of historical PhotoAsset rows — rows the
/// deduplicate-photo-assets maintenance command found to share the same real content hash, even
/// though the PhotoAssets.OriginalContentHash column itself may no longer say so (see that
/// command's doc comment for why migration 20260913154323_AddUserPhotoAssetsAndGlobalContentHash
/// left historical collisions this way) — into a single canonical survivor.
///
/// Deliberately reuses PhotoDuplicateMergeService for the one hard part it already solves: two
/// Photos in the SAME baúl ending up pointing at the same canonical asset. That's exactly the
/// "same BaulId, same exact content" conflict PhotoDuplicateMergeService was built for, just
/// reached from a different starting point (PhotoAsset identity here vs. Photo.OriginalContentHash
/// there) — its listener-driven "reassign recuerdos/tags/covers/shared links onto the survivor,
/// never drop them" rule is exactly the "preserve social/contextual data" rule this needs too, so
/// this deliberately does not invent a second, parallel answer to "what does merging two Photo
/// rows mean".
/// </summary>
public class PhotoAssetMergeService(
    IPhotoRepository photoRepository,
    PhotoDuplicateMergeService photoDuplicateMergeService,
    IUnitOfWork unitOfWork)
{
    // Oldest CreatedAt, then lowest Id — deterministic and content-only (never Photo count,
    // uploader identity, or query order — see docs/.backlog issue #64 §3). Mirrors the
    // ORDER BY "CreatedAt", "Id" migration 20260913154323 used when it kept exactly one row's
    // hash per historical collision, so the canonical this picks today is usually the same row
    // that quietly "won" back then.
    public static PhotoAsset SelectCanonical(IReadOnlyCollection<PhotoAsset> group) =>
        group.OrderBy(a => a.CreatedAt).ThenBy(a => a.Id.Value).First();

    /// <summary>Merges one duplicate group — every PhotoAsset passed in must share the same true
    /// content hash (<paramref name="trustworthyContentHash"/>), computed by the caller (see
    /// DeduplicatePhotoAssetsCommand). Two phases, deliberately not one shared transaction:
    ///
    /// 1. Any same-baúl Active Photo conflict among the group is resolved first, each through its
    ///    own call to PhotoDuplicateMergeService.MergeGroupAsync (which opens its own transaction
    ///    per baúl) — EF/Postgres don't support nesting BeginTransactionAsync (see UnitOfWork), so
    ///    this can't run inside the transaction below.
    /// 2. Everything else — repointing every remaining Photo/UserPhotoAsset reference onto the
    ///    canonical asset, persisting its trustworthy hash, deleting the duplicate PhotoAsset rows
    ///    — runs in one transaction.
    ///
    /// If step 2 fails after step 1 already committed, nothing is corrupted: re-running the
    /// command finds at most one Active Photo left per baúl in this group next time (step 1 is a
    /// no-op) and simply retries step 2 — see the command's own idempotency doc comment.</summary>
    public async Task<PhotoAssetMergeResult> MergeGroupAsync(IReadOnlyCollection<PhotoAsset> group, string trustworthyContentHash)
    {
        if (group.Count < 2)
            throw new ArgumentException("A duplicate group needs at least two PhotoAssets to merge.", nameof(group));

        var canonical = SelectCanonical(group);
        var duplicateIds = group.Where(a => a.Id != canonical.Id).Select(a => a.Id).ToHashSet();

        var allPhotos = await photoRepository.GetAllByAssetIdsAsync(group.Select(a => a.Id));
        var sameBaulConflicts = allPhotos
            .Where(p => p.Status == PhotoStatus.Active)
            .GroupBy(p => p.BaulId)
            .Where(g => g.Count() > 1)
            .Select(g => g.ToList())
            .ToList();

        var photoMerges = new List<PhotoMergeResult>();
        foreach (var conflict in sameBaulConflicts)
            photoMerges.Add(await photoDuplicateMergeService.MergeGroupAsync(conflict));

        // Every branch inside this operation returns Result.Success() — nothing here has a
        // legitimate business-failure outcome to report, only exceptions (which
        // ExecuteInTransactionAsync rolls back and rethrows, same as PhotoDuplicateMergeService).
        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            var remainingPhotos = await photoRepository.GetAllByAssetIdsAsync(group.Select(a => a.Id));
            var photoIdsToRepoint = remainingPhotos
                .Where(p => duplicateIds.Contains(p.PhotoAssetId))
                .Select(p => p.Id)
                .ToList();
            if (photoIdsToRepoint.Count > 0)
                await photoRepository.RepointPhotoAssetIdAsync(photoIdsToRepoint, canonical.Id, trustworthyContentHash);

            var relations = await photoRepository.GetUserPhotoAssetsByAssetIdsAsync(group.Select(a => a.Id));
            foreach (var relation in relations.Where(r => duplicateIds.Contains(r.PhotoAssetId)))
            {
                await photoRepository.RedirectUserPhotoAssetAsync(relation.UserId, canonical.Id, relation.AddedAt);
                await photoRepository.DeleteUserPhotoAssetAsync(relation.UserId, relation.PhotoAssetId);
            }

            if (canonical.OriginalContentHash != trustworthyContentHash)
                await photoRepository.SetAssetContentHashAsync(canonical.Id, trustworthyContentHash);

            foreach (var duplicateId in duplicateIds)
                await photoRepository.DeleteAssetAsync(duplicateId);

            return Result.Success();
        });

        return new PhotoAssetMergeResult(
            canonical.WithOriginalContentHash(trustworthyContentHash),
            group.Where(a => duplicateIds.Contains(a.Id)).ToList(),
            photoMerges);
    }
}

/// <summary>The outcome of one PhotoAssetMergeService.MergeGroupAsync call — everything
/// DeduplicatePhotoAssetsCommand needs to report what happened for one duplicate group.</summary>
public record PhotoAssetMergeResult(
    PhotoAsset Canonical,
    IReadOnlyList<PhotoAsset> Duplicates,
    IReadOnlyList<PhotoMergeResult> SameBaulPhotoMerges);
