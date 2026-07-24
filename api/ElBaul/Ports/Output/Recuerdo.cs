namespace ElBaul.Ports.Output;

public record Recuerdo
(
    Guid Id,
    Guid? PhotoId,
    Guid? ChapterId,
    Guid BaulId,
    string UserId,
    string Text,
    DateTime CreatedAt
);
