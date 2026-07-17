using ElBaul.Ports.Output;

namespace ElBaul.Application;

/// <summary>
/// Enum <-> wire-string conversions. The strings match the frontend's existing
/// TypeScript union types exactly (lowercase role/status, kebab-case activity type)
/// so the DTOs are drop-in compatible with the old Supabase-backed API's JSON shape.
/// </summary>
internal static class DtoMapping
{
    public static string ToApiString(this BaulRole role) => role switch
    {
        BaulRole.Miembro => "miembro",
        BaulRole.Colaborador => "colaborador",
        BaulRole.Custodio => "custodio",
        _ => throw new ArgumentOutOfRangeException(nameof(role))
    };

    public static bool TryParseBaulRole(string value, out BaulRole role)
    {
        switch (value.ToLowerInvariant())
        {
            case "miembro": role = BaulRole.Miembro; return true;
            case "colaborador": role = BaulRole.Colaborador; return true;
            case "custodio": role = BaulRole.Custodio; return true;
            default: role = default; return false;
        }
    }

    public static string ToApiString(this SharedUserStatus status) => status switch
    {
        SharedUserStatus.Pending => "pending",
        SharedUserStatus.Active => "active",
        _ => throw new ArgumentOutOfRangeException(nameof(status))
    };

    public static string ToApiString(this RequestStatus status) => status switch
    {
        RequestStatus.Pending => "pending",
        RequestStatus.Approved => "approved",
        RequestStatus.Rejected => "rejected",
        _ => throw new ArgumentOutOfRangeException(nameof(status))
    };

    public static string ToApiString(this ActivityType type) => type switch
    {
        ActivityType.NewPhotos => "new-photos",
        ActivityType.RoleChanged => "role-changed",
        ActivityType.PhotoRemovalRequest => "photo-removal-request",
        _ => throw new ArgumentOutOfRangeException(nameof(type))
    };
}
