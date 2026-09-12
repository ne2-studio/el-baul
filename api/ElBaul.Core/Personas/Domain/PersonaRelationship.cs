using ElBaul.Domain;
namespace ElBaul.Core.Personas.Domain;

// The single family relationship primitive for v1 — see docs/adr or the feature spec for why
// only Parent->Child exists: "hijo de"/"padre de"/"madre de"/"hija de" are all UI phrasing over
// this one directed edge, never stored as separate relationship kinds. The inverse ("child_of")
// is always derived by reading ChildId's relationships where it's the child, never a second
// stored row — see PersonaRelationshipManager for the invariants this enables (no duplicate
// edge, either end can create/delete it, one single record per pair).
//
// A plain join, not its own aggregate — no identity beyond the (ParentId, ChildId) pair, same
// shape as PhotoPersonaTag. BaulId is redundant with both Personas' own BaulId but stored
// directly anyway, for the same reason PhotoPersonaTag stores it: a single indexed filter for
// DeleteByBaulIdAsync instead of a join.
public record PersonaRelationship(PersonaId ParentId, PersonaId ChildId, BaulId BaulId, DateTime CreatedAt);
