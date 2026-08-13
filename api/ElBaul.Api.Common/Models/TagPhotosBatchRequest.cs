using ElBaul.Domain;
namespace ElBaul.Api.Models;

public record TagPhotosBatchRequest(BaulId BaulId, List<PhotoId> PhotoIds, List<PersonaId> PersonaIds);
