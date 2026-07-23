namespace ElBaul.Ports.Input;

public record RemovalRequestDto
(
    string Id,
    string PhotoId,
    string PhotoUrl,
    string RequesterName,
    string RequesterEmail,
    string? Reason,
    DateTime RequestDate,
    string Status,
    string BaulId
);
