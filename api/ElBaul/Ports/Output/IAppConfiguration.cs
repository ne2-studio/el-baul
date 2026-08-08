namespace ElBaul.Ports.Output;

/// <summary>
/// The handful of plain config values the Application layer needs (e.g. to build canonical
/// deep links). Core never references IConfiguration directly — everything config-shaped
/// that Application code needs goes through a small port like this one, implemented in Infra.
/// </summary>
public interface IAppConfiguration
{
    string PublicUrl { get; }
    string ApiPublicUrl { get; }
    string AdminTestEmailRecipient { get; }

    /// <summary>
    /// External marketing/support site links reused in the transactional-email footer
    /// (and, for HelpCenterUrl, already exposed to the frontend via AppConfigController).
    /// </summary>
    string HelpCenterUrl { get; }
    string PrivacyPolicyUrl { get; }

    /// <summary>
    /// Kill switch for the real (non-test) automatic sends — the recurring schedulers and the
    /// per-user send jobs both check this, so flipping it off mid-batch stops anything still
    /// queued too, not just future scheduling. Defaults to false (opt-in rollout); admin
    /// test-sends are never gated by this.
    /// </summary>
    bool WelcomeEmailsEnabled { get; }
    bool WeeklyDigestEmailsEnabled { get; }

    /// <summary>
    /// Global on/off switch for the AI chat feature. Checked by ChatManager on every request
    /// (not just hidden client-side) so a direct API call still fails cleanly while the
    /// feature is off, defaults to false — the walking skeleton's rollout is all-or-nothing,
    /// not per-family.
    /// </summary>
    bool ChatEnabled { get; }

    /// <summary>
    /// Independent switch for starter question suggestions inside the AI chat. Defaults to
    /// false and is checked before invoking the configured suggestion strategy, because that
    /// strategy may spend AI budget depending on deployment config.
    /// </summary>
    bool ChatSuggestionsEnabled { get; }

    /// <summary>
    /// Global kill switch for public shared links. The backend checks it before creating links
    /// and before serving public HTML, so hiding the UI is not the only protection.
    /// </summary>
    bool SharedLinksEnabled { get; }

    /// <summary>
    /// Global kill switch for the baúl feed (recuerdos + photo-upload-batch cards, the new
    /// GET /baules/{baulId}/feed and /photo-batches endpoints). Defaults to false — while off,
    /// the frontend keeps using the old recuerdos-only endpoint and BaulFeedManager rejects
    /// direct calls too, so hiding the UI is not the only protection.
    /// </summary>
    bool BaulFeedEnabled { get; }
}
