using ElBaul.Core.Personas.Domain;
using ElBaul.Core.Personas.OutputPorts;
namespace ElBaul.Core.Personas.Application;
/// <summary>
/// Enum <-> wire-string conversions for PersonaAccessStatus. The strings match the frontend's
/// existing TypeScript union types exactly (lowercase status) so the DTOs are drop-in
/// compatible with the old Supabase-backed API's JSON shape.
/// </summary>
internal static class DtoMapping
{
    public static string ToApiString(this PersonaAccessStatus status) => status switch
    {
        PersonaAccessStatus.Pending => "pending",
        PersonaAccessStatus.Active => "active",
        _ => throw new ArgumentOutOfRangeException(nameof(status))
    };
}
