namespace ElBaul.Ports.Input;

public record AccessRequestDto
(
    string Id,
    string Email,
    string? Name,
    string? Message,
    DateTime RequestDate,
    string Status,
    string BaulId
);
