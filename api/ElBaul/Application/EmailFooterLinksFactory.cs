using ElBaul.Ports.Output;

namespace ElBaul.Application;

/// <summary>
/// Builds the footer links (help center, privacy policy, contact support) shared by every
/// transactional email, already wrapped as tracked click-through links — kept in one place so
/// WelcomeEmailManager and WeeklyDigestManager don't duplicate the URLs, their click-tracking
/// keys, or the separate build-then-track call pair each used to make.
/// </summary>
public static class EmailFooterLinksFactory
{
    public static EmailFooterLinks BuildTracked(
        string publicUrl, IAppConfiguration appConfiguration, IClock clock, TrackedLinkBuilder linkBuilder) => new(
        HelpCenterUrl: linkBuilder.Track("help-center", appConfiguration.HelpCenterUrl),
        PrivacyPolicyUrl: linkBuilder.Track("privacy-policy", appConfiguration.PrivacyPolicyUrl),
        SupportUrl: linkBuilder.TrackRedirect("support", publicUrl, "/ayuda/soporte"),
        Year: clock.UtcNow().Year);
}
