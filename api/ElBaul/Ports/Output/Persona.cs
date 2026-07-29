namespace ElBaul.Ports.Output;

public record Persona
(
    PersonaId Id,
    BaulId BaulId,
    string? UserId,
    string Nickname,
    BaulRole Role,
    DateTime InvitedDate,
    string? Name = null,
    string? AvatarPhotoKey = null,
    string? Biografia = null,
    PhotoId? AvatarPhotoId = null,
    decimal AvatarCropX = 0.5m,
    decimal AvatarCropY = 0.5m,
    decimal AvatarCropScale = 1m
)
{
    // The single interpretation of "is this Persona row linked to an authenticated account" —
    // callers should ask this instead of re-deriving it from UserId nullity by hand.
    public bool IsClaimed => UserId is not null;
}
