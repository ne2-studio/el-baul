namespace ElBaul.Ports.Output;

public record SharedUser
(
    Guid Id,
    Guid BaulId,
    string? UserId,
    string Nickname,
    BaulRole Role,
    DateTime InvitedDate,
    string? Name = null,
    string? AvatarPhotoKey = null
);
