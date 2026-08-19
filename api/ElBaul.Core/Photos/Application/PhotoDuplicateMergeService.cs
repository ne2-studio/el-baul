using ElBaul.Core.Photos.Domain;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Core.Photos.Application;

/// <summary>
/// Merges one exact-duplicate group (same BaulId + OriginalContentHash, every member currently
/// Active — see the domain definition in docs/.backlog issue #20) into a single active survivor,
/// atomically. The single place both the new-upload race path (PhotoUploadWorkflow) and the
/// deduplicate-photos maintenance command go through, so "what does merging two duplicate
/// photos mean" is answered once — see the PRD's explicit instruction not to invent independent
/// conflicting rules per call site.
///
/// Everything a merge does outside Photos' own tables (shared links, baúl/chapter covers, persona
/// avatars, persona tags, recuerdos) is delegated to IPhotoMergeListener — see its doc comment for
/// why that's one shared port taken as a collection rather than a repository per feature.
/// </summary>
public class PhotoDuplicateMergeService(
    IPhotoRepository photoRepository,
    IEnumerable<IPhotoMergeListener> mergeListeners,
    PhotoLifecycleService photoLifecycle,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    // Oldest photo date wins (PhotoDate has no natural IComparable — a photo with no date at all
    // sorts last, same convention as PhotoOrdering's chronological listing), then oldest
    // CreatedAt, then PhotoId as the final, fully deterministic tie-breaker. Never CreatedAt
    // alone and never database iteration order.
    public static Photo SelectSurvivor(IReadOnlyCollection<Photo> group) =>
        group
            .OrderBy(p => p.TakenAt is null)
            .ThenBy(p => p.TakenAt is null ? default : (p.TakenAt.Year, p.TakenAt.Month ?? 13, p.TakenAt.Day ?? 32))
            .ThenBy(p => p.CreatedAt)
            .ThenBy(p => p.Id.Value)
            .First();

    public static PhotoDate? MinDate(IReadOnlyCollection<Photo> group) =>
        group.Where(p => p.TakenAt is not null).Select(p => p.TakenAt!).OrderBy(d => (d.Year, d.Month ?? 13, d.Day ?? 32)).FirstOrDefault();

    /// <summary>Merges one duplicate group — every Photo passed in must share the same BaulId and
    /// OriginalContentHash and be currently Active; callers (deduplicate-photos,
    /// PhotoUploadWorkflow's race path) are responsible for having found the group that way.
    /// Wraps the whole merge in one transaction (see IUnitOfWork) so a failure partway through
    /// never leaves the group half-merged — the caller is responsible for handling that failure
    /// per-group rather than aborting every other group being processed in the same run.</summary>
    public async Task<PhotoMergeResult> MergeGroupAsync(IReadOnlyCollection<Photo> group)
    {
        if (group.Count < 2)
            throw new ArgumentException("A duplicate group needs at least two photos to merge.", nameof(group));

        var result = await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            var now = clock.UtcNow();
            var survivor = SelectSurvivor(group);
            var duplicates = group.Where(p => p.Id != survivor.Id).ToList();
            var mergeResult = new PhotoMergeResult(survivor, duplicates);

            // Everything outside Photos' own tables — tags, recuerdos, covers, avatars, shared
            // links — is each listener's own responsibility. Runs before the soft-delete below so
            // a listener failure aborts the whole transaction before any duplicate is touched,
            // same as before this was split out.
            foreach (var listener in mergeListeners)
                await listener.OnPhotosMergedAsync(mergeResult, now);

            // RemovalRequest.PhotoId is deliberately left pointing at the (now soft-deleted)
            // duplicate it was raised against: soft-deleting the duplicate already accomplishes
            // what the request asked for, RemovalRequest carries its own denormalized
            // PhotoStorageKey/thumbnail so it still renders regardless of the referenced photo's
            // status, and IBaulRepository exposes no PhotoId-scoped update for it — adding one
            // solely to repoint a concern that's already functionally resolved would be exactly
            // the kind of ad-hoc bypass docs/.backlog issue #20 says not to introduce.

            // Soft-delete every duplicate *before* writing the survivor's own hash/date below —
            // IX_Photos_BaulId_OriginalContentHash_Active only excludes non-Active rows, so
            // updating the survivor while a duplicate still carries the same hash and Active
            // status would trip that same constraint mid-merge.
            foreach (var duplicate in duplicates)
                await photoLifecycle.SoftDeleteAsync(duplicate, PhotoDeletionReasons.FlaggedAsDuplicate);

            // Photo-date rule: the survivor keeps the oldest known date across the whole group,
            // not just its own — see docs/.backlog issue #20 §8. OriginalContentHash is carried
            // over explicitly too: a survivor may not have had its own hash persisted yet.
            var mergedSurvivor = survivor.WithDate(MinDate(group)).WithOriginalContentHash(survivor.OriginalContentHash ?? duplicates[0].OriginalContentHash);
            await photoRepository.UpdateAsync(mergedSurvivor);

            return Result.Success(new PhotoMergeResult(mergedSurvivor, duplicates));
        });

        return result.Value;
    }
}
