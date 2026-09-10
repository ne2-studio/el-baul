namespace ElBaul.Core.Bauls;
public record BaulDto
(
    string Id,
    string Name,
    string? Description,
    int ChapterCount,
    string? CoverPhotoUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string Role,
    bool IsCustodio,
    int MemberCount,
    decimal CoverCropX,
    decimal CoverCropY,
    decimal CoverCropScale,
    // Per-user, server-authoritative "this baúl has activity the current user hasn't seen yet"
    // (baul.UpdatedAt is past their BaulFeedCursor watermark, or they have no watermark at all).
    // Populated on GET /api/baules for the workspace switcher's novedades dots — see
    // BaulesController.GetAll. Defaults to false: the write paths that return a BaulDto (create,
    // rename, cover) are the current user's own action, so there is nothing unseen for them.
    bool HasUnseenActivity = false
);
