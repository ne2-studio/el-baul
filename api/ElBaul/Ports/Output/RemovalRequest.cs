namespace ElBaul.Ports.Output;

public record RemovalRequest
(
    Guid Id,
    Guid BaulId,
    Guid PhotoId,
    string PhotoStorageKey,
    string RequesterName,
    string RequesterEmail,
    string? Reason,
    DateTime RequestDate,
    RequestStatus Status
);
