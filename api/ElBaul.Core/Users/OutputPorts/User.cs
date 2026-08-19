using ElBaul.Domain;
namespace ElBaul.Core.Users.OutputPorts;
public sealed class User : Entity<UserId>
{
    public string Email { get; private set; }
    public string? Name { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? LastAccessAt { get; private set; }
    public bool WeeklyDigestEnabled { get; private set; }
    public bool HasSeenOnboarding { get; private set; }
    public DateTime? LastPushDigestSentAt { get; private set; }

    public User(
    UserId Id,
    string Email,
    string? Name,
    DateTime CreatedAt,
    DateTime? LastAccessAt = null,
    bool WeeklyDigestEnabled = true,
    bool HasSeenOnboarding = false,
    DateTime? LastPushDigestSentAt = null) : base(Id)
    {
        this.Email = Email; this.Name = Name; this.CreatedAt = CreatedAt; this.LastAccessAt = LastAccessAt;
        this.WeeklyDigestEnabled = WeeklyDigestEnabled; this.HasSeenOnboarding = HasSeenOnboarding;
        this.LastPushDigestSentAt = LastPushDigestSentAt;
    }
    public User WithWeeklyDigestEnabled(bool weeklyDigestEnabled)
    {
        WeeklyDigestEnabled = weeklyDigestEnabled;
        return this;
    }

    public User WithOnboardingSeen()
    {
        HasSeenOnboarding = true;
        return this;
    }

    public User WithLastAccessAt(DateTime at) { LastAccessAt = at; return this; }
    public User WithLastPushDigestSentAt(DateTime at) { LastPushDigestSentAt = at; return this; }
}
