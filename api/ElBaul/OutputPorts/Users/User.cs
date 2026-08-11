using ElBaul.Domain;
namespace ElBaul.OutputPorts.Users;
public record User
(
    UserId Id,
    string Email,
    string? Name,
    DateTime CreatedAt,
    DateTime? LastAccessAt = null,
    bool WeeklyDigestEnabled = true,
    bool HasSeenOnboarding = false,
    DateTime? LastPushDigestSentAt = null
);
