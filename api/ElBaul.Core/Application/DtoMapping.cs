using ElBaul.OutputPorts.Chat;
using ElBaul.OutputPorts.Moderation;
using ElBaul.OutputPorts.Personas;
using ElBaul.Domain;
namespace ElBaul.Application;
/// <summary>
/// Enum <-> wire-string conversions. The strings match the frontend's existing
/// TypeScript union types exactly (lowercase role/status) so the DTOs are drop-in
/// compatible with the old Supabase-backed API's JSON shape.
/// </summary>
internal static class DtoMapping
{
    public static string ToApiString(this BaulRole role) => role switch
    {
        BaulRole.Colaborador => "colaborador",
        BaulRole.Administrador => "administrador",
        BaulRole.SinAcceso => "sin_acceso",
        _ => throw new ArgumentOutOfRangeException(nameof(role))
    };

    // Custody itself confers admin rights but isn't a BaulRole value — see BaulRole.cs. Callers
    // that need "is this user an admin of the baúl" should ask BaulAccess.IsAdmin, which ORs
    // IsCustodio in; this only ever sees a persona's own assignable role.
    public static bool IsAdmin(this BaulRole role) => role is BaulRole.Administrador;

    public static string ToApiString(this PersonaAccessStatus status) => status switch
    {
        PersonaAccessStatus.Pending => "pending",
        PersonaAccessStatus.Active => "active",
        PersonaAccessStatus.Revoked => "sin_acceso",
        _ => throw new ArgumentOutOfRangeException(nameof(status))
    };

    public static string ToApiString(this RequestStatus status) => status switch
    {
        RequestStatus.Pending => "pending",
        RequestStatus.Approved => "approved",
        RequestStatus.Rejected => "rejected",
        _ => throw new ArgumentOutOfRangeException(nameof(status))
    };

    public static string ToApiString(this ChatMessageRole role) => role switch
    {
        ChatMessageRole.User => "user",
        ChatMessageRole.Assistant => "assistant",
        _ => throw new ArgumentOutOfRangeException(nameof(role))
    };
}
