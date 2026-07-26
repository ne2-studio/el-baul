namespace ElBaul.Api.Models;

/// <summary>Documentation-only shape for OpenAPI: matches the anonymous `{ success: true }`
/// object returned by actions with no other payload to report. Never constructed at
/// runtime — referenced only from [ProducesResponseType] attributes.</summary>
public record SuccessResponse(bool Success);
