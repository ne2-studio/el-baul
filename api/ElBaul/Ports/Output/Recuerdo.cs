namespace ElBaul.Ports.Output;

public record Recuerdo
(
    RecuerdoId Id,
    PhotoId? PhotoId,
    ChapterId? ChapterId,
    BaulId BaulId,
    string UserId,
    string Text,
    DateTime CreatedAt
);
