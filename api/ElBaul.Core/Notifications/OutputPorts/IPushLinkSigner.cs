namespace ElBaul.Core.Notifications.OutputPorts;
/// <summary>
/// Mints and verifies the self-contained "opened" token carried in a push notification's data
/// payload — same signed-token primitive as IEmailLinkSigner's open-pixel token, but push has
/// no pixel to load: the client calls the decoded endpoint itself when the user taps the
/// notification (Capacitor's pushNotificationActionPerformed), not the OS/mail client.
/// </summary>
public interface IPushLinkSigner
{
    string CreateOpenToken(Guid sentPushNotificationId);

    /// <summary>Returns null if the token is malformed, not one of ours, or fails signature verification.</summary>
    Guid? TryDecodeOpenToken(string token);
}
