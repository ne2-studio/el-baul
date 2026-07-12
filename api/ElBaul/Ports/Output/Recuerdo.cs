namespace ElBaul.Ports.Output;

public record Recuerdo
(
    Guid Id,
    Guid PhotoId,
    string UserId,
    string Text,
    DateTime CreatedAt
);
