namespace ElBaul.Ports.Input;

public record ActivityDto
(
    string Id,
    string Type,
    string BaulId,
    string BaulName,
    DateTime Timestamp,
    bool IsActionable,
    int? PhotoCount,
    string? RequesterEmail,
    string? AccessRequestId,
    string? RemovalRequestId
);
