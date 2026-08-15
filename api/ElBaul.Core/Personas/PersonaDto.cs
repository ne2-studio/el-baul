namespace ElBaul.Core.Personas;
public record PersonaDto
(
    string Id,
    string? UserId,
    string? Email,
    string? Name,
    string Nickname,
    string Role,
    bool IsCustodio,
    string Status,
    DateTime InvitedDate,
    string BaulId,
    string? AvatarUrl,
    bool CanEdit,
    string? Biografia,
    string? AvatarPhotoId,
    decimal AvatarCropX,
    decimal AvatarCropY,
    decimal AvatarCropScale
);
