using ElBaul.Domain;
namespace ElBaul.Api.Models;

public record AddPersonaSpouseRelationshipRequest(PersonaId PersonaId1, PersonaId PersonaId2);
