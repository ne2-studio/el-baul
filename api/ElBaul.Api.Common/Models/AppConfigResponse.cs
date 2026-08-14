namespace ElBaul.Api.Models;

/// <summary>Documentation-only shape for OpenAPI: matches AppConfigController.Get's anonymous
/// response object. Never constructed at runtime — referenced only from
/// [ProducesResponseType] attributes.</summary>
public record AppConfigResponse(
    AppConfigFeatures Features, string? HelpCenterUrl, string? AppUrl, string? GooglePlayUrl,
    int ContributionSuggestionCooldownMinutes, double WriteMemorySuggestionRatio);

public record AppConfigFeatures(
    bool ChatEnabled, bool ChatSuggestionsEnabled, bool SharedLinksEnabled, bool BaulFeedEnabled,
    bool AndroidAppBannerEnabled, bool ChatMemoryEnabled, bool TvModeEnabled, bool MaintenanceModeEnabled);
