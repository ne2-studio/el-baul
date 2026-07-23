using ElBaul.Ports.Output;
using Microsoft.Extensions.Configuration;

namespace ElBaul.Infra;

public class AppConfiguration(IConfiguration configuration) : IAppConfiguration
{
    public string PublicUrl => configuration["App:PublicUrl"] ?? "";
    public string ApiPublicUrl => configuration["Api:PublicUrl"] ?? "";
    public string AdminTestEmailRecipient => configuration["Resend:AdminTestRecipient"] ?? "";

    // GetValue<bool> defaults to false when the key is absent, matching the required default.
    public bool WelcomeEmailsEnabled => configuration.GetValue<bool>("Features:WelcomeEmailsEnabled");
    public bool WeeklyDigestEmailsEnabled => configuration.GetValue<bool>("Features:WeeklyDigestEmailsEnabled");
    public bool ChatEnabled => configuration.GetValue<bool>("Features:ChatEnabled");
}
