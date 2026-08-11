using ElBaul.OutputPorts.Shared;
namespace ElBaul.Api.Models;

public record SetPhotoPersonaTagsRequest(List<PersonaId> PersonaIds);
