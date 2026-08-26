using Ne2Studio.Common;
namespace ElBaul.Domain;
// Custodio is deliberately not a member of this enum — it's not a permission level, it's the
// baúl's singular legal-custody relationship (see Baul.CustodioId / Baul.IsCustodio). A role
// enum member here would let this ever be assigned/changed like a permission, which is exactly
// the state authorization should never allow. See BaulAccessService for how custody and role
// combine into IsAdmin/IsMember.
public enum BaulRole
{
    Colaborador,
    Administrador,
    // Reintroduced after being fully removed when 1:1 invitations shipped (see the historical
    // comment that used to live on PersonaAccessStatus). This time it's a first-class,
    // pre-selectable tier for people who are part of the family's story but should never be
    // invited into the baúl — not, as before, something a persona could only be moved into by
    // having their access revoked. An Active (claimed) persona's role must never be SinAcceso:
    // PersonaManager.UpdatePersonaRoleAsync and PersonaInviteManager.InviteAsync both guard this
    // server-side, behind the UI already refusing to offer it for Active personas.
    SinAcceso
}

// Wire-string <-> BaulRole, public (unlike DtoMapping) so the Presentation layer can parse a
// role string into the enum before it crosses the IPersonaManager input-port boundary. "custodio"
// is intentionally not accepted here — it's never a role a caller can assign, see BaulRole above.
public static class BaulRoleParser
{
    public static Result<BaulRole> Parse(string value) =>
        value.ToLowerInvariant() switch
        {
            "colaborador" => Result.Success(BaulRole.Colaborador),
            "administrador" => Result.Success(BaulRole.Administrador),
            "sin_acceso" => Result.Success(BaulRole.SinAcceso),
            _ => Result.Failure<BaulRole>(ApplicationError.Validation($"'{value}' is not a valid role."))
        };
}
