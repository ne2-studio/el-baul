using ElBaul.Core.Notifications.OutputPorts;
namespace ElBaul.Tests.Fakes;

// A real IEmailLinkSigner needs a configured HMAC key; tests only care that CreateToken/TryDecode
// round-trip and that different (sentEmailId, linkKey, destinationUrl) inputs stay distinguishable,
// so a plain reversible encoding stands in for the signature.
public class FakeEmailLinkSigner : IEmailLinkSigner
{
    public string CreateToken(Guid sentEmailId, string linkKey, string destinationUrl) =>
        $"{sentEmailId}|{Uri.EscapeDataString(linkKey)}|{Uri.EscapeDataString(destinationUrl)}";

    public EmailLinkTokenPayload? TryDecode(string token)
    {
        var parts = token.Split('|', 3);
        if (parts.Length != 3 || !Guid.TryParse(parts[0], out var sentEmailId)) return null;

        return new EmailLinkTokenPayload(sentEmailId, Uri.UnescapeDataString(parts[1]), Uri.UnescapeDataString(parts[2]));
    }

    public string CreateOpenToken(Guid sentEmailId) => $"open|{sentEmailId}";

    public Guid? TryDecodeOpenToken(string token)
    {
        var parts = token.Split('|', 2);
        if (parts.Length != 2 || parts[0] != "open" || !Guid.TryParse(parts[1], out var sentEmailId)) return null;

        return sentEmailId;
    }
}
