using ElBaul.Ports.Output;

namespace ElBaul.Tests.Fakes;

public class StaticAppConfiguration(
    string publicUrl = "https://el-baul.test",
    string adminTestEmailRecipient = "admin@el-baul.test",
    string apiPublicUrl = "https://api.el-baul.test",
    // Defaults to enabled here (unlike the real appsettings.json default of false) so tests
    // that aren't specifically about this flag don't all need to opt in explicitly — the
    // gating behavior itself is covered by its own dedicated tests, constructed with false.
    bool welcomeEmailsEnabled = true,
    bool weeklyDigestEmailsEnabled = true,
    bool chatEnabled = true)
    : IAppConfiguration
{
    public string PublicUrl { get; } = publicUrl;
    public string ApiPublicUrl { get; } = apiPublicUrl;
    public string AdminTestEmailRecipient { get; } = adminTestEmailRecipient;
    public bool WelcomeEmailsEnabled { get; } = welcomeEmailsEnabled;
    public bool WeeklyDigestEmailsEnabled { get; } = weeklyDigestEmailsEnabled;
    public bool ChatEnabled { get; } = chatEnabled;
}
