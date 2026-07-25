namespace ElBaul.Api.Models;

public record TagPhotosBatchRequest(string BaulId, List<string> PhotoIds, List<string> PersonaIds);
