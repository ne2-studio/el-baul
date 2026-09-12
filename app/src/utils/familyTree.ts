import { Persona, PersonaRelationship } from '@/types';

// Pure projection of Personas + PersonaRelationship (Parent -> Child) into a layout the
// tree view can render — no new "FamilyTree"/"TreeNode" domain model, see the feature spec's
// "Consideraciones de dominio". Deliberately dependency-free (no graph-layout library): the
// layout only needs to (a) group people into generations and (b) order them within a
// generation well enough to avoid crossed edges for the common family shapes, not solve
// general DAG layout optimally.

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

export interface FamilyTree {
  nodes: FamilyTreeNode[];
  edges: FamilyTreeEdge[];
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
 */
export function buildFamilyTree(personas: Persona[], relationships: PersonaRelationship[]): FamilyTree {
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

  if (edges.length === 0) return { nodes: [], edges: [], generationCount: 0, slotCount: 0 };

  const childrenOf = new Map<string, string[]>();
  const parentsOf = new Map<string, string[]>();
  const connectedIds = new Set<string>();
  for (const { parentId, childId } of edges) {
    childrenOf.set(parentId, [...(childrenOf.get(parentId) ?? []), childId]);
    parentsOf.set(childId, [...(parentsOf.get(childId) ?? []), parentId]);
    connectedIds.add(parentId);
    connectedIds.add(childId);
  }

  // 1. Split the connected personas into components (undirected connectivity) so unrelated
  // branches of the family never get forced into the same generation numbering.
  const components = groupIntoComponents(connectedIds, childrenOf, parentsOf);

  // 2. Within each component, assign a generation to every node via Kahn's algorithm
  // (topological order by in-degree, counting only edges within this component) — a node's
  // generation is one below the deepest of its already-placed parents. Nodes that can't be
  // reached this way (only possible if the data has a cycle) are placed right after the
  // deepest generation seen so far, instead of being dropped or looping forever.
  const allNodes: FamilyTreeNode[] = [];
  let slotOffset = 0;
  for (const component of components) {
    const generationById = assignGenerations(component, parentsOf);
    const { slotById, width } = assignSlots(component, generationById, parentsOf, childrenOf, personaById);

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

  return { nodes: allNodes, edges, generationCount, slotCount };
}

function groupIntoComponents(
  connectedIds: Set<string>,
  childrenOf: Map<string, string[]>,
  parentsOf: Map<string, string[]>
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
      for (const neighbour of [...(childrenOf.get(id) ?? []), ...(parentsOf.get(id) ?? [])]) {
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

/** Kahn's algorithm restricted to `component`'s own ids, cycle-safe. */
function assignGenerations(component: string[], parentsOf: Map<string, string[]>): Map<string, number> {
  const componentSet = new Set(component);
  const generationById = new Map<string, number>();
  const remainingParents = new Map<string, number>();
  for (const id of component) {
    const parents = (parentsOf.get(id) ?? []).filter((p) => componentSet.has(p));
    remainingParents.set(id, parents.length);
  }

  let queue = component.filter((id) => remainingParents.get(id) === 0);
  let generation = 0;
  const placed = new Set<string>();
  while (queue.length > 0) {
    const next: string[] = [];
    for (const id of queue) {
      generationById.set(id, generation);
      placed.add(id);
    }
    // Re-derive newly-unblocked nodes: any not-yet-placed node whose every within-component
    // parent is now placed.
    for (const id of component) {
      if (placed.has(id)) continue;
      const parents = (parentsOf.get(id) ?? []).filter((p) => componentSet.has(p));
      if (parents.every((p) => placed.has(p))) next.push(id);
    }
    queue = next;
    generation += 1;
  }

  // Cycle fallback: anything left unplaced sits one generation below the deepest placed node,
  // in stable (component) order — good enough for "must not crash", which is all the spec
  // asks of anomalous data.
  const unplaced = component.filter((id) => !placed.has(id));
  if (unplaced.length > 0) {
    const fallbackGeneration = generation; // one past the last generation actually assigned
    for (const id of unplaced) generationById.set(id, fallbackGeneration);
  }

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
  relaxPass(parentsOf, generations);
  relaxPass(childrenOf, [...generations].reverse());
  relaxPass(parentsOf, generations);

  // A relax pass can push a node's position below 0 (e.g. a lone child centred under two
  // parents that got pulled the other way by their own siblings) — shift everything so the
  // leftmost node in the component sits at 0, keeping slots non-negative for the caller.
  const minPosition = Math.min(...positionById.values());
  for (const [id, position] of positionById) positionById.set(id, position - minPosition);

  const width = Math.max(...positionById.values()) + 1;
  return { slotById: positionById, width };
}
