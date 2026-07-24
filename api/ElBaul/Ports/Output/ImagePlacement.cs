namespace ElBaul.Ports.Output;

/// <summary>
/// The UI placement an image URL is destined for. Infra maps each value to a concrete
/// resize preset (dimensions, crop behavior) — Core only knows the symbolic placement,
/// not how it's rendered.
/// </summary>
public enum ImagePlacement
{
    PhotoGridThumbnail,
    PhotoFull,
    ChapterCover,
    ChapterCoverFeatured,
    RemovalRequestThumbnail,
    InvitationPreview,
    BaulCover,
    PersonaAvatar
}
