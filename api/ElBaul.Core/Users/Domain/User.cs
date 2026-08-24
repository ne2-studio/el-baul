using ElBaul.Domain;
namespace ElBaul.Core.Users.Domain;
public sealed class User : Entity<UserId>
{
    public string Email { get; private set; }
    public string? Nombre { get; private set; }
    public string? Apellidos { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? LastAccessAt { get; private set; }
    public bool WeeklyDigestEnabled { get; private set; }
    public bool HasSeenOnboarding { get; private set; }
    public DateTime? LastPushDigestSentAt { get; private set; }

    /// <summary>Nombre + Apellidos joined by a single space, collapsing to just Nombre when
    /// Apellidos is empty. Null when Nombre itself is null. Used wherever a single
    /// full-name string is needed (e.g. seeding Persona.Name).</summary>
    public string? FullName => string.IsNullOrEmpty(Apellidos) ? Nombre : $"{Nombre} {Apellidos}";

    public User(
    UserId Id,
    string Email,
    string? Nombre,
    string? Apellidos,
    DateTime CreatedAt,
    DateTime? LastAccessAt = null,
    bool WeeklyDigestEnabled = true,
    bool HasSeenOnboarding = false,
    DateTime? LastPushDigestSentAt = null) : base(Id)
    {
        this.Email = Email; this.Nombre = Nombre; this.Apellidos = Apellidos; this.CreatedAt = CreatedAt; this.LastAccessAt = LastAccessAt;
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
