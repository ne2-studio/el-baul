using ElBaul.Core.Notifications.Domain;
using ElBaul.Core.Notifications.OutputPorts;
namespace ElBaul.Core.Notifications.Application;
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

    /// <summary>
    /// Absolute URL for the masthead logo served by EmailAssetsController. Unlike the tracking
    /// links above, it's static and untokenized — every email points at the same URL — so it
    /// doesn't need signing, just the API's public base.
    /// </summary>
    public string BuildLogoUrl() => $"{_apiPublicUrl}/email/assets/logo.png";

    /// <summary>
    /// Absolute URL for the welcome-email video thumbnail — same reasoning as
    /// <see cref="BuildLogoUrl"/>: static, untokenized, served from the API's own static
    /// files rather than a controller.
    /// </summary>
    public string BuildOnboardingVideoThumbnailUrl() => $"{_apiPublicUrl}/email/assets/onboarding-video-thumbnail.jpg";

    private static string BuildRedirectUrl(string publicUrl, string path) =>
        $"{publicUrl}/?redirectTo={Uri.EscapeDataString(WithEmailEntrySource(path))}";

    // Marca el destino como llegada por email — el frontend (utils/entrySource.ts) lo usa en
    // BaulRoute para no proponer la recomendación de contribución justo al entrar desde un
    // email. Viaja dentro de `path`, que a su vez viaja dentro de `redirectTo`, así que
    // sobrevive intacto todo el ida-y-vuelta de login sin que ningún paso intermedio (OIDC
    // state, CallbackRoute, PublicRoute) tenga que conocerlo.
    private static string WithEmailEntrySource(string path) =>
        path.Contains('?') ? $"{path}&entry=email" : $"{path}?entry=email";
}
