using ElBaul.Domain;
namespace ElBaul.Api.Models;

public record AddPersonaRelationshipRequest(PersonaId ParentId, PersonaId ChildId);
