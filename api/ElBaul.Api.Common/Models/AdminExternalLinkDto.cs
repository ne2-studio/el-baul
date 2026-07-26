namespace ElBaul.Api.Models;

/// <summary>Documentation-only shape for OpenAPI: matches the anonymous `{ label, url }`
/// objects AdminController.GetExternalLinks yields. Never constructed at runtime —
/// referenced only from [ProducesResponseType] attributes.</summary>
public record AdminExternalLinkDto(string Label, string Url);
