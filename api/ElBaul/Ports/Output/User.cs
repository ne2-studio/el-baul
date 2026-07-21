namespace ElBaul.Ports.Output;

public record User
(
    string Id,
    string Email,
    string? Name,
    DateTime CreatedAt,
    DateTime? LastAccessAt = null,
    bool WeeklyDigestEnabled = true
);
