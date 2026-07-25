namespace ElBaul.Ports.Output;

public record RenderedEmail(string Subject, string Html, string PlainText, string TemplateVersion, string Locale);

/// <summary>
/// Links shared by the footer every transactional email renders — kept as one record so both
/// WelcomeEmailModel and WeeklyDigestEmailModel carry the same shape instead of repeating four
/// loose strings each.
/// </summary>
public record EmailFooterLinks(
    string HelpCenterUrl,
    string PrivacyPolicyUrl,
    string SupportUrl,
    int Year);

public record WelcomeEmailModel(
    string UserName,
    IReadOnlyList<string> BaulNames,
    bool HasBaules,
    string PrimaryCtaUrl,
    string PrimaryCtaLabel,
    string NotificationSettingsUrl,
    EmailFooterLinks Footer);

/// <summary>
/// Turns an email content model into subject/HTML/plain-text — kept separate from
/// IEmailSender so template generation can be unit-tested and previewed without sending
/// anything, and from the Application layer that builds the model so HTML/escaping
/// concerns stay out of business logic.
/// </summary>
public interface IEmailTemplateRenderer
{
    RenderedEmail RenderWelcome(WelcomeEmailModel model);
    RenderedEmail RenderWeeklyDigest(WeeklyDigestEmailModel model);
}
