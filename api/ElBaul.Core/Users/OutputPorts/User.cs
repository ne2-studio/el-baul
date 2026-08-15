using ElBaul.Domain;
namespace ElBaul.Core.Users.OutputPorts;
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
)
{
    public User WithWeeklyDigestEnabled(bool weeklyDigestEnabled) =>
        this with { WeeklyDigestEnabled = weeklyDigestEnabled };

    public User WithOnboardingSeen() =>
        this with { HasSeenOnboarding = true };
}
