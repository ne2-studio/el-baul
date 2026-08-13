using ElBaul.Domain;
namespace ElBaul.Api.Models;

public record SetPhotoPersonaTagsRequest(List<PersonaId> PersonaIds);
