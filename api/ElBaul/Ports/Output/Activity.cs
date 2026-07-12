namespace ElBaul.Ports.Output;

public record Activity
(
    Guid Id,
    ActivityType Type,
    Guid BaulId,
    string BaulName,
    DateTime Timestamp,
    bool IsActionable,
    int? PhotoCount,
    string? RequesterEmail,
    Guid? AccessRequestId,
    Guid? RemovalRequestId
);
