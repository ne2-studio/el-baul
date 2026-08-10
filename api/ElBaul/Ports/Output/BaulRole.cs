using ElBaul.Ports.Shared;

namespace ElBaul.Ports.Output;

public enum BaulRole
{
    Colaborador,
    Administrador,
    Custodio,
    SinAcceso
}

// Wire-string <-> BaulRole, public (unlike DtoMapping) so the Presentation layer can parse a
// role string into the enum before it crosses the IPersonaManager input-port boundary.
public static class BaulRoleParser
{
    public static Result<BaulRole> Parse(string value) =>
        value.ToLowerInvariant() switch
        {
            "colaborador" => Result.Success(BaulRole.Colaborador),
            "administrador" => Result.Success(BaulRole.Administrador),
            "custodio" => Result.Success(BaulRole.Custodio),
            _ => Result.Failure<BaulRole>(ApplicationError.Validation($"'{value}' is not a valid role."))
        };
}
