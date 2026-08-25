using ElBaul.Domain;
namespace ElBaul.Core.Bauls.Application;
/// <summary>
/// Enum <-> wire-string conversions for BaulRole. The strings match the frontend's existing
/// TypeScript union types exactly (lowercase role) so the DTOs are drop-in compatible with the
/// old Supabase-backed API's JSON shape.
/// </summary>
internal static class DtoMapping
{
    public static string ToApiString(this BaulRole role) => role switch
    {
        BaulRole.Colaborador => "colaborador",
        BaulRole.Administrador => "administrador",
        _ => throw new ArgumentOutOfRangeException(nameof(role))
    };

    // Custody itself confers admin rights but isn't a BaulRole value — see BaulRole.cs. Callers
    // that need "is this user an admin of the baúl" should ask BaulAccess.IsAdmin, which ORs
    // IsCustodio in; this only ever sees a persona's own assignable role.
    public static bool IsAdmin(this BaulRole role) => role is BaulRole.Administrador;
}
