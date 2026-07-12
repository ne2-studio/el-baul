namespace ElBaul.Ports.Input;

public record SharedUserDto
(
    string Id,
    string? UserId,
    string Email,
    string? Name,
    string Role,
    string Status,
    DateTime InvitedDate,
    string BaulId
);
