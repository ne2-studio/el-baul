namespace ElBaul.Ports.Output;

/// <summary>A row in the backoffice Usuarios list — a User paired with its baúl count.</summary>
public record AdminUserRow(User User, int BaulCount);

/// <summary>One baúl a user belongs to, for the backoffice user detail screen. PersonId is
/// the Persona's own id — the model the invitation flow already keys off of.</summary>
public record AdminUserBaulRow(BaulId BaulId, string BaulName, BaulRole Role, PersonaId PersonId);

public record AdminUserDetailRow(User User, IEnumerable<AdminUserBaulRow> Baules);
