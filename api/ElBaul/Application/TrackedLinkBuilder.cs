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
}
