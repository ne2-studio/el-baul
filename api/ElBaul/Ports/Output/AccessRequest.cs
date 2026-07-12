namespace ElBaul.Ports.Output;

public record AccessRequest
(
    Guid Id,
    Guid BaulId,
    string Email,
    string? Name,
    string? Message,
    DateTime RequestDate,
    RequestStatus Status
);
