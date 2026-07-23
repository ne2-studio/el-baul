using ElBaul.Ports.Output;

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
        BaulRole.Custodio => "custodio",
        _ => throw new ArgumentOutOfRangeException(nameof(role))
    };

    public static bool TryParseBaulRole(string value, out BaulRole role)
    {
        switch (value.ToLowerInvariant())
        {
            case "colaborador": role = BaulRole.Colaborador; return true;
            case "administrador": role = BaulRole.Administrador; return true;
            case "custodio": role = BaulRole.Custodio; return true;
            default: role = default; return false;
        }
    }

    public static bool IsAdmin(this BaulRole role) => role is BaulRole.Custodio or BaulRole.Administrador;

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
