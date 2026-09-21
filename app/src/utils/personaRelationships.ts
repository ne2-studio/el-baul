import { Persona, PersonaRelationship, PersonaSpouseRelationship } from '../types';

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

/** personaId's one spouse, if any — El Baúl models monogamous families only, so at most one
 * PersonaSpouseRelationship ever involves a given persona (see PersonaSpouseRelationship's doc
 * comment). Resolved against the baúl's full persona list, same as getParents/getChildren. */
export function getSpouse(spouseRelationships: PersonaSpouseRelationship[], personas: Persona[], personaId: string): Persona | undefined {
  const relationship = spouseRelationships.find((r) => r.personaId1 === personaId || r.personaId2 === personaId);
  if (!relationship) return undefined;
  const spouseId = relationship.personaId1 === personaId ? relationship.personaId2 : relationship.personaId1;
  return personas.find((p) => p.id === spouseId);
}

export type RelationshipDirection = 'parent' | 'child' | 'spouse';

/** Excludes candidates who already hold the relationship being added with this Persona in the
 * given direction — the backend rejects those as duplicates (see PersonaRelationshipManager
 * .AddRelationshipAsync / PersonaSpouseRelationshipManager.AddSpouseRelationshipAsync), so a
 * picker shouldn't offer them at all. */
export function filterCandidatesForDirection(
  candidates: Persona[],
  direction: RelationshipDirection,
  parents: Persona[],
  children: Persona[],
  spouse: Persona | null
): Persona[] {
  const excludedIds = new Set(
    direction === 'parent'
      ? children.map((p) => p.id)
      : direction === 'child'
        ? parents.map((p) => p.id)
        : spouse
          ? [spouse.id]
          : []
  );
  return candidates.filter((p) => !excludedIds.has(p.id));
}
