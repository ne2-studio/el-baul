using ElBaul.Ports.Output;

namespace ElBaul.Application;

/// <summary>
/// Builds the footer links (help center, privacy policy, contact support) shared by every
/// transactional email — kept in one place so WelcomeEmailManager and WeeklyDigestManager
/// don't duplicate the URLs or their click-tracking keys.
/// </summary>
public static class EmailFooterLinksFactory
{
    public static EmailFooterLinks Build(string publicUrl, IAppConfiguration appConfiguration, IClock clock) => new(
        HelpCenterUrl: appConfiguration.HelpCenterUrl,
        PrivacyPolicyUrl: appConfiguration.PrivacyPolicyUrl,
        SupportUrl: $"{publicUrl}/?redirectTo={Uri.EscapeDataString("/ayuda/soporte")}",
        Year: clock.UtcNow().Year);

    public static EmailFooterLinks Track(EmailFooterLinks footer, TrackedLinkBuilder linkBuilder) => footer with
    {
        HelpCenterUrl = linkBuilder.Track("help-center", footer.HelpCenterUrl),
        PrivacyPolicyUrl = linkBuilder.Track("privacy-policy", footer.PrivacyPolicyUrl),
        SupportUrl = linkBuilder.Track("support", footer.SupportUrl)
    };
}
