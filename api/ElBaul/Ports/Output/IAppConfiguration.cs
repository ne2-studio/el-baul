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
}
