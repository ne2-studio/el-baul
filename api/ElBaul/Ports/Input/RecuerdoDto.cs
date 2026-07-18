namespace ElBaul.Ports.Input;

public record RecuerdoDto
(
    string Id,
    string? PhotoId,
    string UserId,
    string Text,
    string UserName,
    DateTime CreatedAt,
    bool IsOwn,
    string? PhotoThumbnailUrl = null
);
