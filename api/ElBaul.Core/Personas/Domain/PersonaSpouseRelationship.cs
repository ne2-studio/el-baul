using ElBaul.Domain;
namespace ElBaul.Core.Personas.Domain;

// The "cónyuge" edge: unlike PersonaRelationship (a directed Parent->Child edge), this one is
// symmetric — PersonaId1/PersonaId2 carry no meaning beyond "the two personas", and either can be
// passed in either slot. Still a single stored row per pair, same as PersonaRelationship: the
// inverse read ("who is X's spouse") is always derived, never a second row — see
// PersonaSpouseRelationshipManager for the invariants this enables.
//
// El Baúl models monogamous families only: PersonaSpouseRelationshipManager rejects a second
// spouse relationship for a persona that already has one, so at most one row per persona ever
// exists here at a time.
//
// A plain join, not its own aggregate — no identity beyond the (PersonaId1, PersonaId2) pair, same
// shape as PersonaRelationship/PhotoPersonaTag. BaulId is redundant with both Personas' own BaulId
// but stored directly anyway, for the same reason: a single indexed filter for
// DeleteByBaulIdAsync instead of a join.
public record PersonaSpouseRelationship(PersonaId PersonaId1, PersonaId PersonaId2, BaulId BaulId, DateTime CreatedAt);
