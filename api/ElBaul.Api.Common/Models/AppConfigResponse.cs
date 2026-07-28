namespace ElBaul.Api.Models;

/// <summary>Documentation-only shape for OpenAPI: matches AppConfigController.Get's anonymous
/// response object. Never constructed at runtime — referenced only from
/// [ProducesResponseType] attributes.</summary>
public record AppConfigResponse(AppConfigFeatures Features, string? HelpCenterUrl, string? AppUrl);

public record AppConfigFeatures(bool Monetization, bool ChatEnabled, bool ChatSuggestionsEnabled);
