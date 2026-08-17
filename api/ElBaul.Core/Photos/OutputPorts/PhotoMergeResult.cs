namespace ElBaul.Core.Photos.OutputPorts;

/// <summary>Payload IPhotoMergeListener implementations receive: the survivor a duplicate group
/// was merged into, and the duplicates it absorbed. Lives here rather than in
/// PhotoDuplicateMergeService itself because it's now also part of IPhotoMergeListener's own
/// contract, which other features implement without depending on Photos.Application.</summary>
public record PhotoMergeResult(Photo Survivor, IReadOnlyList<Photo> Duplicates);
