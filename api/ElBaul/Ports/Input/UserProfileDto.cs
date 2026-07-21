namespace ElBaul.Ports.Input;

public record UserProfileDto
(
    string Id,
    string Email,
    string? Name,
    DateTime CreatedAt,
    bool WeeklyDigestEnabled
);
