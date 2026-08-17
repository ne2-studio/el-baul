namespace ElBaul.Core.Photos.OutputPorts;

/// <summary>
/// Notified synchronously, inside the same transaction, whenever PhotoDuplicateMergeService merges
/// a duplicate group into its survivor — lets every feature that keeps its own reference to a
/// Photo (Sharing's SharedLink, Bauls'/Chapters' CoverPhotoId, Personas' AvatarPhotoId and photo
/// tags, Recuerdos) fix that reference up onto the survivor without Photos writing into their
/// OutputPorts directly. Same dependency-inversion rationale as IChapterPhotoCountListener/
/// IBaulPhotoCoverListener, but deliberately ONE shared interface here rather than one per
/// listening feature: several features react to the same event, so PhotoDuplicateMergeService
/// takes an IEnumerable&lt;IPhotoMergeListener&gt; and calls every registered implementation — a
/// separate interface per feature would just move the same fan-out into a longer constructor
/// without removing any coupling. One implementation per feature, each registered with
/// AddScoped&lt;IPhotoMergeListener, ...&gt; in the composition root (multiple registrations of the
/// same service resolve as the IEnumerable), not a message bus.
/// </summary>
public interface IPhotoMergeListener
{
    Task OnPhotosMergedAsync(PhotoMergeResult result, DateTime now);
}
