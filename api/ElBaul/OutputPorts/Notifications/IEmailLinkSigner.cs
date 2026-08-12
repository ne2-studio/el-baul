namespace ElBaul.OutputPorts.Notifications;
/// <summary>
/// Mints and verifies self-contained email tracking tokens: the destination URL (and enough
/// context to record a click) travels inside the signed token itself, so /email/click/{token}
/// never needs a pre-existing database row to redirect correctly. This lets EmailLinkClicks rows
/// be created lazily, only when a link is actually clicked, instead of one row per link at send
/// time regardless of whether it's ever opened.
/// </summary>
public interface IEmailLinkSigner
{
    string CreateToken(Guid sentEmailId, string linkKey, string destinationUrl);

    /// <summary>Returns null if the token is malformed, not one of ours, or fails signature verification.</summary>
    EmailLinkTokenPayload? TryDecode(string token);

    /// <summary>
    /// Same signed-token primitive as CreateToken, but for the open-tracking pixel: a pixel has
    /// exactly one URL per email (no linkKey/destinationUrl to carry), so the payload is just the
    /// owning SentEmail's id. Uses a distinct token prefix from CreateToken so a click token can't
    /// be replayed at the open endpoint, or vice versa.
    /// </summary>
    string CreateOpenToken(Guid sentEmailId);

    /// <summary>Returns null if the token is malformed, not one of ours, or fails signature verification.</summary>
    Guid? TryDecodeOpenToken(string token);
}

public record EmailLinkTokenPayload(Guid SentEmailId, string LinkKey, string DestinationUrl);
