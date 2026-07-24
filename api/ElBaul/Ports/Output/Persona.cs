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
    string? AvatarPhotoKey = null
);
