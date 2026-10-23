namespace ElBaul.Api.Models;

/// <summary>Documentation-only shape for OpenAPI: matches the anonymous `{ error }` object
/// every ErrorMapping.ToActionResult response actually serializes to. Never constructed at
/// runtime — referenced only from [ProducesResponseType] attributes.</summary>
public record ErrorResponse(string Error);
