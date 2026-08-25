namespace ElBaul.Core.Shared.OutputPorts;
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
    string FunctionalTimeZoneId { get; }

    /// <summary>
    /// External marketing/support site links reused in the transactional-email footer
    /// (and, for HelpCenterUrl, already exposed to the frontend via AppConfigController).
    /// </summary>
    string HelpCenterUrl { get; }
    string PrivacyPolicyUrl { get; }

    /// <summary>
    /// Destination for the founder-intro video linked from both welcome-email variants.
    /// Defaults to "" like the other optional external links above.
    /// </summary>
    string OnboardingVideoUrl { get; }

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

    /// <summary>
    /// Kill switch for the daily push-notification digest — same shape as
    /// WeeklyDigestEmailsEnabled: the recurring scheduler and the per-user send job both check
    /// it, so flipping it off mid-batch stops anything still queued too. Defaults to false.
    /// </summary>
    bool PushDigestEnabled { get; }

    /// <summary>
    /// Kill switch for the personal chat memory feature (extraction, retrieval, and the
    /// "Gestionar memoria" management endpoints). Checked server-side by ChatMemoryManager and
    /// ChatMemoryExtractionManager, not just used to hide the frontend menu entry — while off,
    /// no new memories are extracted and none are retrieved into chat context. Defaults to
    /// false, same rollout shape as ChatEnabled.
    /// </summary>
    bool ChatMemoryEnabled { get; }

    /// <summary>
    /// How many of a user's memories RelevantChatMemorySelector retrieves per chat turn (and
    /// offers the extractor as dedup/update context) — kept small and configurable, same
    /// reasoning as RelevantRecuerdoSelector.MaxRelevantRecuerdos but exposed here (rather than
    /// a private const) since the PRD calls for it to be tunable without a deploy.
    /// </summary>
    int ChatMemoryRetrievalLimit { get; }

    /// <summary>
    /// Kill switch for Modo TV (temporary read-only TV sessions). The backend checks it before
    /// creating a session and before serving its content, same "not just hiding the UI" shape
    /// as SharedLinksEnabled. Defaults to false.
    /// </summary>
    bool TvModeEnabled { get; }

    /// <summary>
    /// Global maintenance switch. While true, MaintenanceModeMiddleware short-circuits every
    /// request with 503 except GET /api/app-config itself (the frontend needs that endpoint to
    /// keep working so it can learn maintenance mode is on and show the maintenance screen, and
    /// learn it's back off without a deploy). Defaults to false.
    /// </summary>
    bool MaintenanceModeEnabled { get; }

    /// <summary>
    /// Whether the app's Android-only install banner is shown. Purely presentational (no
    /// server-side gating besides this switch itself) — kept here rather than read straight off
    /// IConfiguration by AppConfigController so every Features:* toggle goes through the same
    /// port, regardless of backing store.
    /// </summary>
    bool AndroidAppBannerEnabled { get; }

    /// <summary>
    /// Kill switch for the Biografía tab on a persona's ficha. Checked server-side too — both
    /// by PersonaManager.UpdatePersonaBiografiaAsync (rejects writes while off) and by
    /// ChatContextBuilder (omits Biografía from the AI's context while off) — so hiding the
    /// frontend tab is not the only protection. Defaults to false, same rollout shape as the
    /// other feature toggles here.
    /// </summary>
    bool BiografiaEnabled { get; }

    /// <summary>
    /// Probability (0-1) that ContributionsManager picks "write a memory" over "tag people" when
    /// choosing which contribution suggestion to offer on entering a baúl. Same key/default
    /// (0.2) as AppConfigController's own copy, which still reads it from IConfiguration
    /// directly for backward compatibility with app versions that decided the type client-side —
    /// this port is only for the new server-side decision in Contributions.
    /// </summary>
    double WriteMemorySuggestionRatio { get; }
}
