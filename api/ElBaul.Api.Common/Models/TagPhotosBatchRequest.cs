using ElBaul.Ports.Output;

namespace ElBaul.Api.Models;

public record TagPhotosBatchRequest(BaulId BaulId, List<PhotoId> PhotoIds, List<PersonaId> PersonaIds);
