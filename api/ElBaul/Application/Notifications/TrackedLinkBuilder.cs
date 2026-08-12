using ElBaul.Application.Notifications;
using ElBaul.OutputPorts.Notifications;
namespace ElBaul.Application.Notifications;
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

    /// <summary>
    /// Builds the absolute /email/open/{token}.gif URL for this email's tracking pixel — the
    /// same self-contained-token approach as Track, but the token only carries the SentEmail id
    /// (a pixel has exactly one URL per email, unlike links which have one per linkKey).
    /// </summary>
    public string BuildOpenPixelUrl() =>
        $"{_apiPublicUrl}/email/open/{signer.CreateOpenToken(sentEmailId)}.gif";

    private static string BuildRedirectUrl(string publicUrl, string path) =>
        $"{publicUrl}/?redirectTo={Uri.EscapeDataString(path)}";
}
