namespace ElBaul.Ports.Output;

public enum BaulRole
{
    Colaborador,
    Administrador,
    Custodio
}

// Wire-string <-> BaulRole, public (unlike DtoMapping) so the Presentation layer can parse a
// role string into the enum before it crosses the IPersonaManager input-port boundary.
public static class BaulRoleParser
{
    public static bool TryParse(string value, out BaulRole role)
    {
        switch (value.ToLowerInvariant())
        {
            case "colaborador": role = BaulRole.Colaborador; return true;
            case "administrador": role = BaulRole.Administrador; return true;
            case "custodio": role = BaulRole.Custodio; return true;
            default: role = default; return false;
        }
    }
}
