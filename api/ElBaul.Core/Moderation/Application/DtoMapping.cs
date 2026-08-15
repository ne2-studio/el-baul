using ElBaul.Core.Moderation.OutputPorts;
namespace ElBaul.Core.Moderation.Application;
/// <summary>
/// Enum <-> wire-string conversions for RequestStatus. The strings match the frontend's
/// existing TypeScript union types exactly (lowercase status) so the DTOs are drop-in
/// compatible with the old Supabase-backed API's JSON shape.
/// </summary>
internal static class DtoMapping
{
    public static string ToApiString(this RequestStatus status) => status switch
    {
        RequestStatus.Pending => "pending",
        RequestStatus.Approved => "approved",
        RequestStatus.Rejected => "rejected",
        _ => throw new ArgumentOutOfRangeException(nameof(status))
    };
}
