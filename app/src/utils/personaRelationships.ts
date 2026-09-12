import { Persona, PersonaRelationship } from '../types';

// The inverse of a stored Parent->Child edge is always derived here, never a second stored
// row — see PersonaRelationship's doc comment. These are the only two ways the rest of the app
// should ever read the family graph.

/** Every persona who is a parent of personaId, resolved against the baúl's full persona list. */
export function getParents(relationships: PersonaRelationship[], personas: Persona[], personaId: string): Persona[] {
  const parentIds = relationships.filter((r) => r.childId === personaId).map((r) => r.parentId);
  return personas.filter((p) => parentIds.includes(p.id));
}

/** Every persona who is a child of personaId, resolved against the baúl's full persona list. */
export function getChildren(relationships: PersonaRelationship[], personas: Persona[], personaId: string): Persona[] {
  const childIds = relationships.filter((r) => r.parentId === personaId).map((r) => r.childId);
  return personas.filter((p) => childIds.includes(p.id));
}
