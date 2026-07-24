namespace ElBaul.Ports.Input;

public record PersonaDto
(
    string Id,
    string? UserId,
    string? Email,
    string? Name,
    string Nickname,
    string Role,
    string Status,
    DateTime InvitedDate,
    string BaulId,
    string? AvatarUrl,
    bool CanEdit
);
