using ElBaul.Core.Chat.Domain;
using ElBaul.Core.Chat.OutputPorts;
namespace ElBaul.Core.Chat.Application;
/// <summary>
/// Enum <-> wire-string conversions for ChatMessageRole. The strings match the frontend's
/// existing TypeScript union types exactly (lowercase role) so the DTOs are drop-in
/// compatible with the old Supabase-backed API's JSON shape.
/// </summary>
internal static class DtoMapping
{
    public static string ToApiString(this ChatMessageRole role) => role switch
    {
        ChatMessageRole.User => "user",
        ChatMessageRole.Assistant => "assistant",
        _ => throw new ArgumentOutOfRangeException(nameof(role))
    };
}
