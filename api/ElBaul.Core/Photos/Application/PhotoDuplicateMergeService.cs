using ElBaul.Core.Bauls.OutputPorts;
using ElBaul.Core.Chapters.OutputPorts;
using ElBaul.Core.Personas.OutputPorts;
using ElBaul.Core.Photos.OutputPorts;
using ElBaul.Core.Recuerdos.OutputPorts;
using ElBaul.Core.Shared.OutputPorts;
using ElBaul.Core.Sharing.OutputPorts;
using Ne2Studio.Common;

using ElBaul.Domain;
namespace ElBaul.Core.Photos.Application;

public record PhotoMergeResult(Photo Survivor, IReadOnlyList<Photo> Duplicates);

/// <summary>
/// Merges one exact-duplicate group (same BaulId + OriginalContentHash, every member currently
/// Active — see the domain definition in docs/.backlog issue #20) into a single active survivor,
/// atomically. The single place both the new-upload race path (PhotoUploadWorkflow) and the
/// maintenance commands (backfill-photo-content-hashes' own race path, deduplicate-photos) go
/// through, so "what does merging two duplicate photos mean" is answered once — see the PRD's
/// explicit instruction not to invent independent conflicting rules per call site.
/// </summary>
public class PhotoDuplicateMergeService(
    IPhotoRepository photoRepository,
    IChapterRepository chapterRepository,
    IBaulRepository baulRepository,
    IRecuerdoRepository recuerdoRepository,
    IPhotoPersonaTagRepository photoPersonaTagRepository,
    ISharedLinkRepository sharedLinkRepository,
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
            .OrderBy(p => p.Date is null)
            .ThenBy(p => p.Date is null ? default : (p.Date.Year, p.Date.Month ?? 13, p.Date.Day ?? 32))
            .ThenBy(p => p.CreatedAt)
            .ThenBy(p => p.Id.Value)
            .First();

    public static PhotoDate? MinDate(IReadOnlyCollection<Photo> group) =>
        group.Where(p => p.Date is not null).Select(p => p.Date!).OrderBy(d => (d.Year, d.Month ?? 13, d.Day ?? 32)).FirstOrDefault();

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
            var allIds = group.Select(p => p.Id).ToList();

            // Tagged people: union every duplicate's tags onto the survivor's — SetTagsAsync
            // replaces the survivor's full tag set, and a persona already tagged on the survivor
            // is naturally deduplicated by the Distinct() below (see PhotoPersonaTagManager, the
            // same "photo can only carry one relationship per PersonaId" invariant).
            var tagsByPhoto = await photoPersonaTagRepository.GetPersonaIdsByPhotoIdsAsync(allIds);
            var unionedPersonaIds = tagsByPhoto.Values.SelectMany(personaIds => personaIds).Distinct().ToList();
            if (unionedPersonaIds.Count > 0)
                await photoPersonaTagRepository.SetTagsAsync(survivor.Id, survivor.BaulId, unionedPersonaIds, now);

            // Memories/comments: reassign every duplicate's recuerdos onto the survivor, keeping
            // the entities themselves (authorship/timestamps untouched) rather than recreating them.
            foreach (var duplicate in duplicates)
            {
                foreach (var recuerdo in await recuerdoRepository.GetByPhotoIdAsync(duplicate.Id))
                    await recuerdoRepository.UpdateAsync(recuerdo.ForPhoto(survivor.Id));
            }

            // Cover references: redirect any baúl/chapter currently using a to-be-merged
            // duplicate as its cover onto the survivor's own (bit-identical) blob, never onto the
            // duplicate's storage key — see docs/.backlog issue #20 §17, the survivor must never
            // reference the duplicate's blob.
            var baul = await baulRepository.GetByIdAsync(survivor.BaulId);
            if (baul is not null && duplicates.Any(d => d.StorageKey == baul.CoverPhotoKey))
                await baulRepository.UpdateAsync(baul.WithCoverPhotoKey(survivor.StorageKey, now));

            foreach (var chapterId in duplicates.Select(d => d.ChapterId).Where(id => id is not null).Select(id => id!.Value).Distinct())
            {
                var chapter = await chapterRepository.GetByIdAsync(chapterId);
                if (chapter is not null && duplicates.Any(d => d.ChapterId == chapterId && d.StorageKey == chapter.CoverPhotoKey))
                    await chapterRepository.UpdateAsync(chapter.WithCoverPhotoKey(survivor.StorageKey, now));
            }

            // Persona avatar photo references, same redirect rationale as covers above.
            var personas = await baulRepository.GetPersonasAsync(survivor.BaulId);
            foreach (var persona in personas.Where(p => p.AvatarPhotoId is { } avatarPhotoId && duplicates.Any(d => d.Id == avatarPhotoId)))
                await baulRepository.UpdatePersonaAsync(persona.WithAvatarPhotoId(survivor.Id));

            // Shared links: a link generated for a duplicate must keep working, pointing at the
            // survivor, rather than silently breaking once the duplicate is soft-deleted.
            var duplicateIds = duplicates.Select(d => d.Id).ToList();
            foreach (var sharedLink in await sharedLinkRepository.GetByPhotoIdsAsync(duplicateIds))
                await sharedLinkRepository.UpdateAsync(sharedLink with { PhotoId = survivor.Id });

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
            // over explicitly too: a survivor reached via the backfill race path (see
            // BackfillPhotoContentHashesCommand) may not have had its own hash persisted yet.
            var mergedSurvivor = survivor.WithDate(MinDate(group)).WithOriginalContentHash(survivor.OriginalContentHash ?? duplicates[0].OriginalContentHash);
            await photoRepository.UpdateAsync(mergedSurvivor);

            return Result.Success(new PhotoMergeResult(mergedSurvivor, duplicates));
        });

        return result.Value;
    }
}
