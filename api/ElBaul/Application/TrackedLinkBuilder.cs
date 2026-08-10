using ElBaul.Ports.Output;

namespace ElBaul.Application;

/// <summary>
/// Wraps a destination URL into an absolute /email/click/{token} tracking link. The token is
/// self-contained (signed via IEmailLinkSigner) — it carries the owning SentEmail's id, the
/// link's key, and the destination URL, so EmailTrackingController can verify and redirect
/// without a database lookup. That's what lets EmailLinkClicks rows be created lazily, only on
/// an actual click, instead of one row per link at send time.
/// </summary>
public class TrackedLinkBuilder(string apiPublicUrl, IEmailLinkSigner signer, Guid sentEmailId)
{
    private readonly string _apiPublicUrl = apiPublicUrl.TrimEnd('/');

    public string Track(string linkKey, string destinationUrl)
    {
        var token = signer.CreateToken(sentEmailId, linkKey, destinationUrl);
        return $"{_apiPublicUrl}/email/click/{token}";
    }

    /// <summary>
    /// Builds a deep link into the app (publicUrl/?redirectTo=path) and tracks it in the same
    /// step — the one-call counterpart to what every *EmailManager used to do by hand: build an
    /// untracked redirect URL while composing its model, then walk the model a second time to
    /// call Track on each field. Collapsing both into one call means a link can no longer be
    /// added to a model without also being tracked.
    /// </summary>
    public string TrackRedirect(string linkKey, string publicUrl, string path) =>
        Track(linkKey, BuildRedirectUrl(publicUrl, path));

    private static string BuildRedirectUrl(string publicUrl, string path) =>
        $"{publicUrl}/?redirectTo={Uri.EscapeDataString(path)}";
}
