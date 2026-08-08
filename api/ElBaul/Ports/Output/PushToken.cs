namespace ElBaul.Ports.Output;

public record PushToken
(
    Guid Id,
    string UserId,
    string Token,
    string Platform,
    DateTime CreatedAt
);
