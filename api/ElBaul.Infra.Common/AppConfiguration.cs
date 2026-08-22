using ElBaul.Core.Shared.OutputPorts;
using Microsoft.Extensions.Configuration;

namespace ElBaul.Infra;

public class AppConfiguration(IConfiguration configuration) : IAppConfiguration
{
    public string PublicUrl => configuration["App:PublicUrl"] ?? "";
    public string ApiPublicUrl => configuration["Api:PublicUrl"] ?? "";
    public string AdminTestEmailRecipient => configuration["Resend:AdminTestRecipient"] ?? "";
    public string FunctionalTimeZoneId => configuration["Analytics:FunctionalTimeZoneId"] ?? "Europe/Madrid";
    public string HelpCenterUrl => configuration["Support:HelpCenterUrl"] ?? "";
    public string PrivacyPolicyUrl => configuration["Legal:PrivacyPolicyUrl"] ?? "";
    public string OnboardingVideoUrl => configuration["Onboarding:VideoUrl"] ?? "";

    // GetValue<bool> defaults to false when the key is absent, matching the required default.
    public bool WelcomeEmailsEnabled => configuration.GetValue<bool>("Features:WelcomeEmailsEnabled");
    public bool WeeklyDigestEmailsEnabled => configuration.GetValue<bool>("Features:WeeklyDigestEmailsEnabled");
    public bool ChatEnabled => configuration.GetValue<bool>("Features:ChatEnabled");
    public bool ChatSuggestionsEnabled => configuration.GetValue<bool>("Features:ChatSuggestionsEnabled");
    public bool SharedLinksEnabled => configuration.GetValue<bool>("Features:SharedLinksEnabled");
    public bool BaulFeedEnabled => configuration.GetValue<bool>("Features:BaulFeedEnabled");
    public bool PushDigestEnabled => configuration.GetValue<bool>("Features:PushDigestEnabled");
    public bool ChatMemoryEnabled => configuration.GetValue<bool>("Features:ChatMemoryEnabled");
    public int ChatMemoryRetrievalLimit => configuration.GetValue("Features:ChatMemoryRetrievalLimit", 5);
    public bool TvModeEnabled => configuration.GetValue<bool>("Features:TvModeEnabled");
    public bool MaintenanceModeEnabled => configuration.GetValue<bool>("Features:MaintenanceModeEnabled");
    public bool AndroidAppBannerEnabled => configuration.GetValue<bool>("Features:AndroidAppBannerEnabled");
    public double WriteMemorySuggestionRatio => configuration.GetValue("Features:WriteMemorySuggestionRatio", 0.2);
}
