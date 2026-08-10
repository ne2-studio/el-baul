using ElBaul.Ports.Output;

namespace ElBaul.Api.Models;

public record SetPhotoPersonaTagsRequest(List<PersonaId> PersonaIds);
