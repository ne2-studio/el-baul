using ElBaul.OutputPorts.Bauls;
using ElBaul.OutputPorts.Chat;
using ElBaul.OutputPorts.Personas;
using ElBaul.OutputPorts.Sharing;
using ElBaul.Domain;
namespace ElBaul.OutputPorts.Shared;
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
        BaulRole.Custodio => "custodio",
        BaulRole.SinAcceso => "sin_acceso",
        _ => throw new ArgumentOutOfRangeException(nameof(role))
    };

    public static bool IsAdmin(this BaulRole role) => role is BaulRole.Custodio or BaulRole.Administrador;

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
