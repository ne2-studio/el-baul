namespace ElBaul.Core.Users.InputPorts;
public record UserProfileDto
(
    string Id,
    string Email,
    string? Name,
    DateTime CreatedAt,
    bool WeeklyDigestEnabled,
    bool HasSeenOnboarding
);
