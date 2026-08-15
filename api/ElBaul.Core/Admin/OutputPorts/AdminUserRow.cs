using ElBaul.Core.Users.OutputPorts;
using ElBaul.Domain;
namespace ElBaul.Core.Admin.OutputPorts;
/// <summary>A row in the backoffice Usuarios list — a User paired with its baúl count.</summary>
public record AdminUserRow(User User, int BaulCount);

/// <summary>One baúl a user belongs to, for the backoffice user detail screen. PersonId is
/// the Persona's own id — the model the invitation flow already keys off of. IsCustodio is
/// carried separately from Role because custody isn't a BaulRole value (see BaulRole.cs) —
/// AdminManager synthesizes the "custodio" wire string from it, the same pattern as
/// BaulAccess.RoleApiString.</summary>
public record AdminUserBaulRow(BaulId BaulId, string BaulName, BaulRole Role, PersonaId PersonId, bool IsCustodio);

public record AdminUserDetailRow(User User, IEnumerable<AdminUserBaulRow> Baules);
