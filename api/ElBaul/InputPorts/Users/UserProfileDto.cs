namespace ElBaul.InputPorts.Users;
public record UserProfileDto
(
    string Id,
    string Email,
    string? Name,
    DateTime CreatedAt,
    bool WeeklyDigestEnabled,
    bool HasSeenOnboarding
);
