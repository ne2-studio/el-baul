namespace ElBaul.Ports.Output;

public record SharedUser
(
    Guid Id,
    Guid BaulId,
    string? UserId,
    string Email,
    BaulRole Role,
    SharedUserStatus Status,
    DateTime InvitedDate
);
