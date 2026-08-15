namespace ElBaul.Tests.Fakes;

public class StaticAppConfiguration(
    string publicUrl = "https://el-baul.test",
    string adminTestEmailRecipient = "admin@el-baul.test",
    string apiPublicUrl = "https://api.el-baul.test",
    string helpCenterUrl = "https://el-baul-web.test/ayuda",
    string privacyPolicyUrl = "https://el-baul-web.test/legal/privacy-policy/",
    // Defaults to enabled here (unlike the real appsettings.json default of false) so tests
    // that aren't specifically about this flag don't all need to opt in explicitly — the
    // gating behavior itself is covered by its own dedicated tests, constructed with false.
    bool welcomeEmailsEnabled = true,
    bool weeklyDigestEmailsEnabled = true,
    bool chatEnabled = true,
    bool chatSuggestionsEnabled = true,
    bool sharedLinksEnabled = true,
    bool baulFeedEnabled = true,
    bool pushDigestEnabled = true,
    bool chatMemoryEnabled = true,
    int chatMemoryRetrievalLimit = 5,
    bool tvModeEnabled = true,
    // Defaults to false here too (unlike most other flags above) — maintenance mode gating is
    // covered by its own dedicated tests, constructed with true.
    bool maintenanceModeEnabled = false)
    : IAppConfiguration
{
    public string PublicUrl { get; } = publicUrl;
    public string ApiPublicUrl { get; } = apiPublicUrl;
    public string AdminTestEmailRecipient { get; } = adminTestEmailRecipient;
    public string FunctionalTimeZoneId { get; } = "Europe/Madrid";
    public string HelpCenterUrl { get; } = helpCenterUrl;
    public string PrivacyPolicyUrl { get; } = privacyPolicyUrl;
    public bool WelcomeEmailsEnabled { get; } = welcomeEmailsEnabled;
    public bool WeeklyDigestEmailsEnabled { get; } = weeklyDigestEmailsEnabled;
    public bool ChatEnabled { get; } = chatEnabled;
    public bool ChatSuggestionsEnabled { get; } = chatSuggestionsEnabled;
    public bool SharedLinksEnabled { get; } = sharedLinksEnabled;
    public bool BaulFeedEnabled { get; } = baulFeedEnabled;
    public bool PushDigestEnabled { get; } = pushDigestEnabled;
    public bool ChatMemoryEnabled { get; } = chatMemoryEnabled;
    public int ChatMemoryRetrievalLimit { get; } = chatMemoryRetrievalLimit;
    public bool TvModeEnabled { get; } = tvModeEnabled;
    public bool MaintenanceModeEnabled { get; } = maintenanceModeEnabled;
}
