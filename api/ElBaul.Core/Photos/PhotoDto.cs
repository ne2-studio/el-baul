namespace ElBaul.Core.Photos;
public record PhotoDto
(
    string Id,
    string? ChapterId,
    string BaulId,
    string ThumbnailUrl,
    string FullUrl,
    int? DateYear,
    int? DateMonth,
    int? DateDay,
    string UploadedBy,
    DateTime CreatedAt,
    int RecuerdoCount,
    // The backend's single source of truth for which of the two mutually-exclusive destructive
    // menu actions this caller gets for this photo — see PhotoDeletePolicy. Never both true: the
    // frontend must render off these flags directly instead of re-deriving isAdmin/isOwnPhoto/
    // upload-age itself, which is exactly the kind of duplicated rule that drifts.
    bool CanDelete,
    bool CanRequestRemoval,
    // True only for an upload response whose bytes exactly matched an already-active photo in
    // the same baúl — see PhotoUploadWorkflow.PhotoUploadOutcome. Photo itself is then the
    // pre-existing survivor, not the just-uploaded bytes. Never true for any other read path
    // (GetByChapterIdAsync, GetPageAsync, …) — see PhotoDtoProjector.ProjectAsync's default.
    bool AlreadyExisted = false
);

public record PhotoDownloadResult(Stream Content, string ContentType, string FileName);

public record PhotoPageDto(IReadOnlyList<PhotoDto> Items, bool HasMore);
