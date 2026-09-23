using ElBaul.Core.Notifications.OutputPorts;
namespace ElBaul.Tests.Fakes;

// A real IPushLinkSigner needs a configured HMAC key; tests only care that CreateOpenToken/
// TryDecodeOpenToken round-trip — same rationale as FakeEmailLinkSigner.
public class FakePushLinkSigner : IPushLinkSigner
{
    public string CreateOpenToken(Guid sentPushNotificationId) => $"open|{sentPushNotificationId}";

    public Guid? TryDecodeOpenToken(string token)
    {
        var parts = token.Split('|', 2);
        if (parts.Length != 2 || parts[0] != "open" || !Guid.TryParse(parts[1], out var sentPushNotificationId)) return null;

        return sentPushNotificationId;
    }
}
