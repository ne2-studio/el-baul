using ElBaul.Shared;
namespace ElBaul.OutputPorts.Sharing;
public record RemovalRequest
(
    RemovalRequestId Id,
    BaulId BaulId,
    PhotoId PhotoId,
    string PhotoStorageKey,
    string RequesterName,
    string RequesterEmail,
    string? Reason,
    DateTime RequestDate,
    RequestStatus Status
);
