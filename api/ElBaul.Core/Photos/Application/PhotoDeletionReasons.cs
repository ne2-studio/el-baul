namespace ElBaul.Core.Photos.Application;

// DeletionReason itself is a free-text column (see PhotoConfiguration) — most values are
// user-supplied (a removal request's Reason) or a caller-chosen short label (PhotoManager.DeleteAsync's
// `reason` parameter). This is the one deletion reason the system itself assigns, so it's a
// constant rather than a literal repeated at every soft-delete call site — see
// PhotoDuplicateMergeService and PhotoUploadWorkflow.
public static class PhotoDeletionReasons
{
    public const string FlaggedAsDuplicate = "FlaggedAsDuplicate";
}
