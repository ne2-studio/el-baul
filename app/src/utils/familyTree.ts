import { Persona, PersonaRelationship, PersonaSpouseRelationship } from '@/types';

// Pure projection of Personas + PersonaRelationship (Parent -> Child) + PersonaSpouseRelationship
// (symmetric "cónyuge" edge) into a layout the tree view can render — no new
// "FamilyTree"/"TreeNode" domain model, see the feature spec's "Consideraciones de dominio".
// Deliberately dependency-free (no graph-layout library): the layout only needs to (a) group
// people into generations and (b) order them within a generation well enough to avoid crossed
// edges for the common family shapes, not solve general DAG layout optimally.

export interface FamilyTreeNode {
  persona: Persona;
  generation: number;
  /**
   * Horizontal position within its generation row, already offset so no two components overlap.
   * Not necessarily an integer: a child of two parents (or a group of siblings) is centred
   * between/under them, which can land it halfway between two whole slots — see assignSlots.
   */
  slot: number;
}

export interface FamilyTreeEdge {
  parentId: string;
  childId: string;
}

/** A "cónyuge" edge between two nodes already placed on the same generation row — rendered as
 * the two-interlocked-rings connector, see FamilyTreeView. Unordered, same as
 * PersonaSpouseRelationship: personaId1/personaId2 carry no meaning. */
export interface FamilySpouseEdge {
  personaId1: string;
  personaId2: string;
}

export interface FamilyTree {
  nodes: FamilyTreeNode[];
  edges: FamilyTreeEdge[];
  spouseEdges: FamilySpouseEdge[];
  /** Number of generation rows and the widest row's slot count — for the caller to size its canvas. */
  generationCount: number;
  slotCount: number;
}

/**
 * Builds the forest of family trees to render from a baúl's personas and relationships.
 *
 * - Personas with no relationship at all are left out entirely (they stay in Mosaico only —
 *   see the "Personas desconectadas" section of the spec).
 * - Several disconnected groups of relatives ("componentes") are laid out side by side.
 * - Parents are always placed at least one generation above their children. A cycle in the
 *   data (which the domain should prevent, but the UI must not trust blindly) is broken by
 *   ignoring whichever edges would otherwise revisit a node already placed — see the
 *   toposort loop below, which visits each node at most once.
 * - Spouses always land on the same generation row, next to each other — see spousesOf's use
 *   in assignGenerations (co-parent grouping) and assignSlots (barycenter/relax passes).
 */
export function buildFamilyTree(
  personas: Persona[],
  relationships: PersonaRelationship[],
  spouseRelationships: PersonaSpouseRelationship[] = []
): FamilyTree {
  const personaById = new Map(personas.map((p) => [p.id, p]));

  // Only keep edges between personas that actually exist in this baúl's persona list, and
  // dedupe defensively (the backend shouldn't produce duplicates, but the layout below assumes
  // at most one edge per parent/child pair).
  const seenEdges = new Set<string>();
  const edges: FamilyTreeEdge[] = [];
  for (const r of relationships) {
    if (!personaById.has(r.parentId) || !personaById.has(r.childId) || r.parentId === r.childId) continue;
    const key = `${r.parentId}>${r.childId}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    edges.push({ parentId: r.parentId, childId: r.childId });
  }

  const seenSpouseEdges = new Set<string>();
  const spouseEdges: FamilySpouseEdge[] = [];
  for (const r of spouseRelationships) {
    if (!personaById.has(r.personaId1) || !personaById.has(r.personaId2) || r.personaId1 === r.personaId2) continue;
    const key = [r.personaId1, r.personaId2].sort().join('>');
    if (seenSpouseEdges.has(key)) continue;
    seenSpouseEdges.add(key);
    spouseEdges.push({ personaId1: r.personaId1, personaId2: r.personaId2 });
  }

  if (edges.length === 0 && spouseEdges.length === 0) return { nodes: [], edges: [], spouseEdges: [], generationCount: 0, slotCount: 0 };

  const childrenOf = new Map<string, string[]>();
  const parentsOf = new Map<string, string[]>();
  const spousesOf = new Map<string, string[]>();
  const connectedIds = new Set<string>();
  for (const { parentId, childId } of edges) {
    childrenOf.set(parentId, [...(childrenOf.get(parentId) ?? []), childId]);
    parentsOf.set(childId, [...(parentsOf.get(childId) ?? []), parentId]);
    connectedIds.add(parentId);
    connectedIds.add(childId);
  }
  for (const { personaId1, personaId2 } of spouseEdges) {
    spousesOf.set(personaId1, [...(spousesOf.get(personaId1) ?? []), personaId2]);
    spousesOf.set(personaId2, [...(spousesOf.get(personaId2) ?? []), personaId1]);
    connectedIds.add(personaId1);
    connectedIds.add(personaId2);
  }

  // 1. Split the connected personas into components (undirected connectivity, over parent/child
  // AND spouse edges) so unrelated branches of the family never get forced into the same
  // generation numbering.
  const components = groupIntoComponents(connectedIds, childrenOf, parentsOf, spousesOf);

  // 2. Within each component, assign a generation to every node via Kahn's algorithm
  // (topological order by in-degree, counting only edges within this component) — a node's
  // generation is one below the deepest of its already-placed parents. Nodes that can't be
  // reached this way (only possible if the data has a cycle) are placed right after the
  // deepest generation seen so far, instead of being dropped or looping forever.
  const allNodes: FamilyTreeNode[] = [];
  let slotOffset = 0;
  for (const component of components) {
    const generationById = assignGenerations(component, parentsOf, spousesOf);
    const { slotById, width } = assignSlots(component, generationById, parentsOf, childrenOf, spousesOf, personaById);

    for (const id of component) {
      const persona = personaById.get(id);
      if (!persona) continue;
      allNodes.push({ persona, generation: generationById.get(id)!, slot: slotById.get(id)! + slotOffset });
    }
    // Leave a gap of one empty slot between components so their edges never visually touch.
    slotOffset += width + 1;
  }

  const generationCount = allNodes.reduce((max, n) => Math.max(max, n.generation + 1), 0);
  const slotCount = Math.ceil(allNodes.reduce((max, n) => Math.max(max, n.slot + 1), 0));

  return { nodes: allNodes, edges, spouseEdges, generationCount, slotCount };
}

/**
 * Narrow projection for a persona's own "Familia" tab: just personaId, their parents, their
 * siblings (the other children of those same parents), and their children — never grandparents,
 * grandchildren, nieces/nephews, or their children's other parent. Not the whole branch they
 * belong to, deliberately: this is meant to answer "who is this person's immediate family",
 * not "show me their entire family tree" (that's what the baúl-wide Árbol genealógico is for).
 * Laying it out is just buildFamilyTree again, but over this trimmed-down persona/relationship
 * subset — which also means a couple's children still end up centred between them, etc., same
 * as the full tree. Returns an empty tree when personaId has no relationships at all.
 */
export function buildPersonaFamilyTree(
  personas: Persona[],
  relationships: PersonaRelationship[],
  personaId: string,
  spouseRelationships: PersonaSpouseRelationship[] = []
): FamilyTree {
  const personaById = new Map(personas.map((p) => [p.id, p]));
  const emptyTree: FamilyTree = { nodes: [], edges: [], spouseEdges: [], generationCount: 0, slotCount: 0 };
  if (!personaById.has(personaId)) return emptyTree;

  const validEdges = relationships.filter(
    (r) => personaById.has(r.parentId) && personaById.has(r.childId) && r.parentId !== r.childId
  );
  const validSpouseEdges = spouseRelationships.filter(
    (r) => personaById.has(r.personaId1) && personaById.has(r.personaId2) && r.personaId1 !== r.personaId2
  );

  const parentIds = new Set(validEdges.filter((e) => e.childId === personaId).map((e) => e.parentId));
  const siblingIds = new Set(
    validEdges.filter((e) => parentIds.has(e.parentId) && e.childId !== personaId).map((e) => e.childId)
  );
  const childIds = new Set(validEdges.filter((e) => e.parentId === personaId).map((e) => e.childId));
  const spouseId = validSpouseEdges.find((e) => e.personaId1 === personaId || e.personaId2 === personaId);
  const spouseIds = new Set<string>(spouseId ? [spouseId.personaId1 === personaId ? spouseId.personaId2 : spouseId.personaId1] : []);

  const scopeIds = new Set<string>([personaId, ...parentIds, ...siblingIds, ...childIds, ...spouseIds]);
  if (scopeIds.size === 1) return emptyTree;

  const scopedPersonas = personas.filter((p) => scopeIds.has(p.id));
  const scopedRelationships = validEdges.filter((e) => scopeIds.has(e.parentId) && scopeIds.has(e.childId));
  const scopedSpouseRelationships = validSpouseEdges.filter((e) => scopeIds.has(e.personaId1) && scopeIds.has(e.personaId2));

  return buildFamilyTree(scopedPersonas, scopedRelationships, scopedSpouseRelationships);
}

function groupIntoComponents(
  connectedIds: Set<string>,
  childrenOf: Map<string, string[]>,
  parentsOf: Map<string, string[]>,
  spousesOf: Map<string, string[]>
): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const startId of connectedIds) {
    if (visited.has(startId)) continue;
    const component: string[] = [];
    const queue = [startId];
    visited.add(startId);
    while (queue.length > 0) {
      const id = queue.shift()!;
      component.push(id);
      for (const neighbour of [...(childrenOf.get(id) ?? []), ...(parentsOf.get(id) ?? []), ...(spousesOf.get(id) ?? [])]) {
        if (!visited.has(neighbour)) {
          visited.add(neighbour);
          queue.push(neighbour);
        }
      }
    }
    components.push(component);
  }

  return components;
}

/**
 * Kahn's algorithm restricted to `component`'s own ids, cycle-safe — but run at the granularity
 * of "couples" (a union-find group of everyone who co-parents at least one child together), not
 * individual people. Without this, a person with no parents recorded in this baúl always lands
 * on generation 0, even when their partner (the child's other parent) has parents of their own
 * placing them deeper in the tree — the two would end up on different rows despite having
 * children together. Grouping co-parents first means the whole couple takes the deepest
 * generation either of them would get on their own, and every one of their shared children still
 * lands exactly one row below that. Spouses are unioned the same way — even a childless couple
 * must land on the same row (see spousesOf).
 */
function assignGenerations(
  component: string[],
  parentsOf: Map<string, string[]>,
  spousesOf: Map<string, string[]>
): Map<string, number> {
  const componentSet = new Set(component);
  const coParentsOf = (id: string) => (parentsOf.get(id) ?? []).filter((p) => componentSet.has(p));

  // Union-find over co-parents of the same child, and over spouses.
  const unionParent = new Map<string, string>();
  for (const id of component) unionParent.set(id, id);
  const find = (id: string): string => {
    let root = id;
    while (unionParent.get(root) !== root) root = unionParent.get(root)!;
    let cur = id;
    while (unionParent.get(cur) !== root) {
      const next = unionParent.get(cur)!;
      unionParent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) unionParent.set(ra, rb);
  };
  for (const id of component) {
    const parents = coParentsOf(id);
    for (let i = 1; i < parents.length; i += 1) union(parents[0], parents[i]);
    for (const spouseId of spousesOf.get(id) ?? []) if (componentSet.has(spouseId)) union(id, spouseId);
  }

  const groupOf = new Map(component.map((id) => [id, find(id)]));

  // Group-level parent edges: an edge landing back inside the same group (e.g. anomalous data
  // where someone is recorded as their own co-parent's ancestor) is dropped rather than trusted,
  // the same "must not crash" guarantee the per-person version had.
  const groupParentsOf = new Map<string, Set<string>>();
  for (const id of component) {
    const group = groupOf.get(id)!;
    for (const p of coParentsOf(id)) {
      const parentGroup = groupOf.get(p)!;
      if (parentGroup === group) continue;
      if (!groupParentsOf.has(group)) groupParentsOf.set(group, new Set());
      groupParentsOf.get(group)!.add(parentGroup);
    }
  }

  const groups = [...new Set(component.map((id) => groupOf.get(id)!))];
  const remainingParents = new Map(groups.map((g) => [g, groupParentsOf.get(g)?.size ?? 0]));

  let queue = groups.filter((g) => remainingParents.get(g) === 0);
  let generation = 0;
  const placed = new Set<string>();
  const levelOf = new Map<string, number>();
  while (queue.length > 0) {
    for (const g of queue) {
      levelOf.set(g, generation);
      placed.add(g);
    }
    const next: string[] = [];
    for (const g of groups) {
      if (placed.has(g)) continue;
      const parentGroups = groupParentsOf.get(g) ?? new Set();
      if ([...parentGroups].every((p) => placed.has(p))) next.push(g);
    }
    queue = next;
    generation += 1;
  }

  // Cycle fallback: anything left unplaced sits one generation below the deepest placed group,
  // in stable (component) order — good enough for "must not crash", which is all the spec asks
  // of anomalous data.
  const unplacedGroups = groups.filter((g) => !placed.has(g));
  if (unplacedGroups.length > 0) {
    const fallbackGeneration = generation; // one past the last generation actually assigned
    for (const g of unplacedGroups) levelOf.set(g, fallbackGeneration);
  }

  const generationById = new Map<string, number>();
  for (const id of component) generationById.set(id, levelOf.get(groupOf.get(id)!)!);

  return generationById;
}

/**
 * Positions nodes within each generation, left-to-right. Two steps:
 *
 * 1. Fix the left-to-right ORDER with the usual barycenter heuristic (average parent rank, then
 *    average child rank) — this is what keeps related nodes together and avoids crossed edges.
 * 2. With that order locked in, relax each node's actual x position towards the average position
 *    of its parents/children — see the spec's rule that a child of two parents must land
 *    centred between them (and a group of siblings centred as a block under a couple), not just
 *    "somewhere in the right order". Positions are therefore not necessarily whole numbers.
 *
 * A left-to-right sweep followed by a right-to-left sweep (averaged) keeps every node as close
 * as possible to that centred target while never crossing a neighbour or landing closer than one
 * slot to it.
 */
function assignSlots(
  component: string[],
  generationById: Map<string, number>,
  parentsOf: Map<string, string[]>,
  childrenOf: Map<string, string[]>,
  spousesOf: Map<string, string[]>,
  personaById: Map<string, Persona>
): { slotById: Map<string, number>; width: number } {
  const byGeneration = new Map<number, string[]>();
  for (const id of component) {
    const gen = generationById.get(id)!;
    byGeneration.set(gen, [...(byGeneration.get(gen) ?? []), id]);
  }
  const generations = [...byGeneration.keys()].sort((a, b) => a - b);

  // Step 1: seed order alphabetically, then two barycenter passes to fix a good left-to-right
  // order — this part never changes a node's generation-mates' relative order again.
  let orderById = new Map<string, number>();
  for (const gen of generations) {
    byGeneration.get(gen)!
      .slice()
      .sort((a, b) => (personaById.get(a)?.nickname ?? '').localeCompare(personaById.get(b)?.nickname ?? '', 'es'))
      .forEach((id, index) => orderById.set(id, index));
  }

  const barycenterRank = (id: string, relatives: Map<string, string[]>): number | null => {
    const relatedRanks = (relatives.get(id) ?? []).map((r) => orderById.get(r)).filter((r): r is number => r !== undefined);
    if (relatedRanks.length === 0) return null;
    return relatedRanks.reduce((sum, r) => sum + r, 0) / relatedRanks.length;
  };

  const reorderPass = (relatives: Map<string, string[]>) => {
    const next = new Map<string, number>();
    for (const gen of generations) {
      const ids = byGeneration.get(gen)!;
      const withKey = ids.map((id) => ({ id, key: barycenterRank(id, relatives) ?? orderById.get(id)! }));
      withKey
        .sort((a, b) => a.key - b.key || (personaById.get(a.id)?.nickname ?? '').localeCompare(personaById.get(b.id)?.nickname ?? '', 'es'))
        .forEach(({ id }, index) => next.set(id, index));
    }
    orderById = next;
  };

  reorderPass(parentsOf);
  reorderPass(childrenOf);

  // Spouses last, and not via reorderPass/barycenter: two mutual spouses each ranking by the
  // other's PRE-pass order don't converge, they swap (Jaime ranks where Pedro was and vice
  // versa, so both move but land just as far apart) — see the regression this replaced.
  // Instead this splices each pair together as a genuinely adjacent block: whichever spouse has
  // fewer blood connections of their own in this row (parents/children — a childless couple
  // already agrees via parentsOf/childrenOf, so this only matters for a "married into a
  // different branch" pair) is relocated to sit immediately after their partner, who keeps their
  // own place in the row.
  const coalesceSpouses = () => {
    const next = new Map<string, number>();
    for (const gen of generations) {
      const ids = byGeneration.get(gen)!;
      const idsInGen = new Set(ids);
      const sorted = ids.slice().sort((a, b) => orderById.get(a)! - orderById.get(b)!);
      const bloodConnections = (id: string) => (parentsOf.get(id)?.length ?? 0) + (childrenOf.get(id)?.length ?? 0);

      // anchor stays at its current place in the row; mover gets spliced in right after it.
      const moverOfAnchor = new Map<string, string>();
      const anchorOfMover = new Map<string, string>();
      const resolved = new Set<string>();
      for (const id of sorted) {
        const spouseId = spousesOf.get(id)?.find((s) => idsInGen.has(s));
        if (!spouseId || resolved.has(id) || resolved.has(spouseId)) continue;
        resolved.add(id);
        resolved.add(spouseId);
        const [anchor, mover] = bloodConnections(id) >= bloodConnections(spouseId) ? [id, spouseId] : [spouseId, id];
        moverOfAnchor.set(anchor, mover);
        anchorOfMover.set(mover, anchor);
      }

      const placed = new Set<string>();
      let index = 0;
      for (const id of sorted) {
        if (placed.has(id)) continue;
        // A mover is only ever placed via its anchor's turn (right below) — visiting it here
        // first (it can sort earlier than its anchor, e.g. two cousins from different branches
        // marrying) must not let it grab its own standalone slot, or the couple ends up exactly
        // as split apart as before the fix.
        if (anchorOfMover.has(id)) continue;
        next.set(id, index++);
        placed.add(id);
        const mover = moverOfAnchor.get(id);
        if (mover && !placed.has(mover)) {
          next.set(mover, index++);
          placed.add(mover);
        }
      }
      // Safety net, not expected to ever trigger: a mover whose anchor was somehow never placed.
      for (const id of sorted) {
        if (!placed.has(id)) {
          next.set(id, index++);
          placed.add(id);
        }
      }
    }
    orderById = next;
  };
  coalesceSpouses();

  // Step 2: relax continuous positions towards parents'/children's positions, order fixed above.
  const positionById = new Map<string, number>();
  for (const gen of generations) {
    byGeneration.get(gen)!.forEach((id) => positionById.set(id, orderById.get(id)!));
  }

  const orderedIdsOf = (gen: number) => byGeneration.get(gen)!.slice().sort((a, b) => orderById.get(a)! - orderById.get(b)!);

  const relaxPass = (relatives: Map<string, string[]>, gensInOrder: number[]) => {
    for (const gen of gensInOrder) {
      const ids = orderedIdsOf(gen);
      const desired = ids.map((id) => {
        const relatedPositions = (relatives.get(id) ?? []).map((r) => positionById.get(r)).filter((p): p is number => p !== undefined);
        return relatedPositions.length > 0
          ? relatedPositions.reduce((sum, p) => sum + p, 0) / relatedPositions.length
          : positionById.get(id)!;
      });

      const leftPass: number[] = [];
      let prev = -Infinity;
      for (const d of desired) {
        const p = Math.max(d, prev + 1);
        leftPass.push(p);
        prev = p;
      }
      const rightPass: number[] = new Array(ids.length);
      let next = Infinity;
      for (let i = ids.length - 1; i >= 0; i -= 1) {
        const p = Math.min(desired[i], next - 1);
        rightPass[i] = p;
        next = p;
      }
      ids.forEach((id, i) => positionById.set(id, (leftPass[i] + rightPass[i]) / 2));
    }
  };

  // Down pass (centre children under parents), up pass (centre parents over children), then one
  // more down pass to settle — enough for the shallow, small family trees this product deals with.
  // Final spouse pass: pulls a couple's positions together last, so it wins the tie-break without
  // undoing how their shared children got centred under them.
  relaxPass(parentsOf, generations);
  relaxPass(childrenOf, [...generations].reverse());
  relaxPass(parentsOf, generations);
  relaxPass(spousesOf, generations);

  // A relax pass can push a node's position below 0 (e.g. a lone child centred under two
  // parents that got pulled the other way by their own siblings) — shift everything so the
  // leftmost node in the component sits at 0, keeping slots non-negative for the caller.
  const minPosition = Math.min(...positionById.values());
  for (const [id, position] of positionById) positionById.set(id, position - minPosition);

  const width = Math.max(...positionById.values()) + 1;
  return { slotById: positionById, width };
}
