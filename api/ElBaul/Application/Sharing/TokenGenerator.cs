using System.Text;
using ElBaul.OutputPorts.Shared;
namespace ElBaul.Application.Sharing;
/// <summary>
/// Opaque, unguessable public link tokens — shared by SharedLinkManager and
/// BaulInviteLinkManager, the two places that hand out a token-bearer public URL.
/// </summary>
internal static class TokenGenerator
{
    public static string NewToken(IIdGenerator idGenerator)
    {
        var bytes = Encoding.UTF8.GetBytes($"{idGenerator.NewId():N}{idGenerator.NewId():N}");
        return Convert.ToBase64String(bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }
}
