using ElBaul.Core.Shared.OutputPorts;
using Microsoft.Extensions.Configuration;
using Unleash;

namespace ElBaul.Infra;

/// <summary>
/// Unleash-backed IAppConfiguration — el-baul-api (SaaS) only, wired up when UNLEASH_ENABLED is
/// true (see ServiceRegistration). el-baul-api-lite keeps the static appsettings/env-var
/// AppConfiguration in ElBaul.Infra.Common unconditionally: third-party self-hosters have no
/// access to our Unleash server.
///
/// Flag names are namespaced "elbaul.&lt;kebab-case-property&gt;" because the free/OSS Unleash
/// tier has a single shared "Default" project across every app on the instance — see
/// docs/architecture/backend.md. Environment (dev/staging/prod) is not part of the name: it's a
/// first-class Unleash concept, selected by which environment-scoped API token this adapter is
/// configured with.
///
/// Non-flag values (URLs, tuning knobs like WriteMemorySuggestionRatio) stay in IConfiguration —
/// Unleash here is only for the boolean kill switches, not general config.
/// </summary>
public class UnleashAppConfiguration(IUnleash unleash, IConfiguration configuration) : IAppConfiguration
{
    public string PublicUrl => configuration["App:PublicUrl"] ?? "";
    public string ApiPublicUrl => configuration["Api:PublicUrl"] ?? "";
    public string AdminTestEmailRecipient => configuration["Resend:AdminTestRecipient"] ?? "";
    public string FunctionalTimeZoneId => configuration["Analytics:FunctionalTimeZoneId"] ?? "Europe/Madrid";
    public string HelpCenterUrl => configuration["Support:HelpCenterUrl"] ?? "";
    public string PrivacyPolicyUrl => configuration["Legal:PrivacyPolicyUrl"] ?? "";
    public string OnboardingVideoUrl => configuration["Onboarding:VideoUrl"] ?? "";

    // IUnleash.IsEnabled defaults to false for an unknown/unreachable toggle, matching every
    // flag's required default here.
    public bool WelcomeEmailsEnabled => unleash.IsEnabled("elbaul.welcome-emails-enabled");
    public bool WeeklyDigestEmailsEnabled => unleash.IsEnabled("elbaul.weekly-digest-emails-enabled");
    public bool ChatEnabled => unleash.IsEnabled("elbaul.chat-enabled");
    public bool ChatSuggestionsEnabled => unleash.IsEnabled("elbaul.chat-suggestions-enabled");
    public bool SharedLinksEnabled => unleash.IsEnabled("elbaul.shared-links-enabled");
    public bool BaulFeedEnabled => unleash.IsEnabled("elbaul.baul-feed-enabled");
    public bool PushDigestEnabled => unleash.IsEnabled("elbaul.push-digest-enabled");
    public bool ChatMemoryEnabled => unleash.IsEnabled("elbaul.chat-memory-enabled");
    public int ChatMemoryRetrievalLimit => configuration.GetValue("Features:ChatMemoryRetrievalLimit", 5);
    public bool TvModeEnabled => unleash.IsEnabled("elbaul.tv-mode-enabled");
    public bool MaintenanceModeEnabled => unleash.IsEnabled("elbaul.maintenance-mode-enabled");
    public bool AndroidAppBannerEnabled => unleash.IsEnabled("elbaul.android-app-banner-enabled");
    public bool BiografiaEnabled => unleash.IsEnabled("elbaul.biografia-enabled");
    public double WriteMemorySuggestionRatio => configuration.GetValue("Features:WriteMemorySuggestionRatio", 0.2);
}
