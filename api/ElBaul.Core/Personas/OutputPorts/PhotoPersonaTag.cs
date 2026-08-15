using ElBaul.Domain;
namespace ElBaul.Core.Personas.OutputPorts;
// A plain join, not its own aggregate — no identity beyond the (PhotoId, PersonaId) pair.
// BaulId is redundant with Photo.BaulId/Persona.BaulId but stored directly anyway, mirroring
// Photo.BaulId's own rationale (see PhotoConfiguration): it's what makes DeleteByBaulIdAsync a
// single indexed filter instead of a join.
public record PhotoPersonaTag(PhotoId PhotoId, PersonaId PersonaId, BaulId BaulId, DateTime CreatedAt);
