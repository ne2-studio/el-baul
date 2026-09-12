import { describe, expect, it } from 'vitest';
import { Persona, PersonaRelationship } from '@/types';
import { buildFamilyTree, buildPersonaFamilyTree } from './familyTree';

function persona(id: string, nickname = id): Persona {
  return { id, baulId: 'baul-1', nickname, status: 'active', role: 'colaborador', invitedDate: '' } as Persona;
}

function rel(parentId: string, childId: string): PersonaRelationship {
  return { parentId, childId } as PersonaRelationship;
}

function generationOf(tree: ReturnType<typeof buildFamilyTree>, id: string) {
  return tree.nodes.find((n) => n.persona.id === id)?.generation;
}

describe('buildFamilyTree', () => {
  it('returns an empty tree when there are no relationships', () => {
    const tree = buildFamilyTree([persona('a'), persona('b')], []);
    expect(tree.nodes).toEqual([]);
    expect(tree.edges).toEqual([]);
  });

  it('leaves personas with no relationship out of the tree entirely', () => {
    const personas = [persona('a'), persona('b'), persona('manolo'), persona('pepe')];
    const tree = buildFamilyTree(personas, [rel('a', 'b')]);
    const ids = tree.nodes.map((n) => n.persona.id).sort();
    expect(ids).toEqual(['a', 'b']);
  });

  it('lays out a simple chain A -> B -> C across three generations', () => {
    const personas = [persona('a'), persona('b'), persona('c')];
    const tree = buildFamilyTree(personas, [rel('a', 'b'), rel('b', 'c')]);
    expect(generationOf(tree, 'a')).toBe(0);
    expect(generationOf(tree, 'b')).toBe(1);
    expect(generationOf(tree, 'c')).toBe(2);
  });

  it('places two parents in the same generation, above their shared child', () => {
    const personas = [persona('a'), persona('b'), persona('c')];
    const tree = buildFamilyTree(personas, [rel('a', 'c'), rel('b', 'c')]);
    expect(generationOf(tree, 'a')).toBe(0);
    expect(generationOf(tree, 'b')).toBe(0);
    expect(generationOf(tree, 'c')).toBe(1);
    const [slotA, slotB] = [tree.nodes.find((n) => n.persona.id === 'a')!.slot, tree.nodes.find((n) => n.persona.id === 'b')!.slot];
    expect(slotA).not.toBe(slotB);
  });

  it('places several children of the same parent in one generation, each with a distinct slot', () => {
    const personas = [persona('a'), persona('b'), persona('c'), persona('d')];
    const tree = buildFamilyTree(personas, [rel('a', 'b'), rel('a', 'c'), rel('a', 'd')]);
    expect(generationOf(tree, 'b')).toBe(1);
    expect(generationOf(tree, 'c')).toBe(1);
    expect(generationOf(tree, 'd')).toBe(1);
    const slots = ['b', 'c', 'd'].map((id) => tree.nodes.find((n) => n.persona.id === id)!.slot);
    expect(new Set(slots).size).toBe(3);
  });

  it('spans several generations: A,B -> C -> D -> E', () => {
    const personas = ['a', 'b', 'c', 'd', 'e'].map((id) => persona(id));
    const tree = buildFamilyTree(personas, [rel('a', 'c'), rel('b', 'c'), rel('c', 'd'), rel('d', 'e')]);
    expect(generationOf(tree, 'a')).toBe(0);
    expect(generationOf(tree, 'c')).toBe(1);
    expect(generationOf(tree, 'd')).toBe(2);
    expect(generationOf(tree, 'e')).toBe(3);
    expect(tree.generationCount).toBe(4);
  });

  it('lays out a branching family: A,B -> C -> D,E and D -> F,G', () => {
    const personas = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => persona(id));
    const tree = buildFamilyTree(personas, [
      rel('a', 'c'), rel('b', 'c'),
      rel('c', 'd'), rel('c', 'e'),
      rel('d', 'f'), rel('d', 'g'),
    ]);
    expect(generationOf(tree, 'a')).toBe(0);
    expect(generationOf(tree, 'c')).toBe(1);
    expect(generationOf(tree, 'd')).toBe(2);
    expect(generationOf(tree, 'e')).toBe(2);
    expect(generationOf(tree, 'f')).toBe(3);
    expect(generationOf(tree, 'g')).toBe(3);
    expect(tree.edges).toHaveLength(6);
  });

  it('lays out disconnected components (A->B and C->D) without inventing a connection', () => {
    const personas = ['a', 'b', 'c', 'd'].map((id) => persona(id));
    const tree = buildFamilyTree(personas, [rel('a', 'b'), rel('c', 'd')]);
    expect(tree.nodes).toHaveLength(4);
    // Both components start their own chain at generation 0.
    expect(generationOf(tree, 'a')).toBe(0);
    expect(generationOf(tree, 'c')).toBe(0);
    // They must not share a slot at the same generation (that would draw them overlapping).
    const slotA = tree.nodes.find((n) => n.persona.id === 'a')!.slot;
    const slotC = tree.nodes.find((n) => n.persona.id === 'c')!.slot;
    expect(slotA).not.toBe(slotC);
  });

  it('does not loop forever or throw on cyclic data, and still places every involved persona', () => {
    const personas = ['a', 'b', 'c'].map((id) => persona(id));
    const relationships = [rel('a', 'b'), rel('b', 'c'), rel('c', 'a')];

    expect(() => buildFamilyTree(personas, relationships)).not.toThrow();

    const tree = buildFamilyTree(personas, relationships);
    expect(tree.nodes.map((n) => n.persona.id).sort()).toEqual(['a', 'b', 'c']);
    // Every node got some generation number assigned (no NaN/undefined leaking out).
    for (const node of tree.nodes) {
      expect(Number.isInteger(node.generation)).toBe(true);
      // Slots aren't always whole numbers (a child centred between two parents lands halfway
      // between them — see the "centers a child of two parents..." test), just finite.
      expect(Number.isFinite(node.slot)).toBe(true);
    }
  });

  it('aligns a co-parent with no ancestors of their own to their partner\'s generation', () => {
    // Abuela -> Tita Gloria -> (Prima Sara). Tito Paco is Prima Sara's other parent but has no
    // parents recorded in this baúl at all — he must still land on Tita Gloria's row, not
    // generation 0, since they co-parent a child together.
    const personas = [persona('abuela'), persona('gloria'), persona('paco'), persona('sara')];
    const tree = buildFamilyTree(personas, [
      rel('abuela', 'gloria'),
      rel('gloria', 'sara'),
      rel('paco', 'sara'),
    ]);
    expect(generationOf(tree, 'abuela')).toBe(0);
    expect(generationOf(tree, 'gloria')).toBe(1);
    expect(generationOf(tree, 'paco')).toBe(1);
    expect(generationOf(tree, 'sara')).toBe(2);
  });

  it('keeps a chain of co-parenting couples each on their own row', () => {
    // grandma+grandpa -> (mum, aunt); mum+dad -> kid. `dad` has no parents recorded, `aunt` has
    // no children — both must still resolve to sane, non-overlapping generations.
    const personas = ['grandma', 'grandpa', 'mum', 'aunt', 'dad', 'kid'].map((id) => persona(id));
    const tree = buildFamilyTree(personas, [
      rel('grandma', 'mum'), rel('grandpa', 'mum'),
      rel('grandma', 'aunt'), rel('grandpa', 'aunt'),
      rel('mum', 'kid'), rel('dad', 'kid'),
    ]);
    expect(generationOf(tree, 'grandma')).toBe(0);
    expect(generationOf(tree, 'grandpa')).toBe(0);
    expect(generationOf(tree, 'mum')).toBe(1);
    expect(generationOf(tree, 'aunt')).toBe(1);
    expect(generationOf(tree, 'dad')).toBe(1);
    expect(generationOf(tree, 'kid')).toBe(2);
  });

  it('centers a child of two parents exactly between them', () => {
    const personas = [persona('a'), persona('b'), persona('c')];
    const tree = buildFamilyTree(personas, [rel('a', 'c'), rel('b', 'c')]);
    const slot = (id: string) => tree.nodes.find((n) => n.persona.id === id)!.slot;
    expect(slot('c')).toBeCloseTo((slot('a') + slot('b')) / 2);
  });

  it('centers a couple over their two children as a block', () => {
    const personas = [persona('a'), persona('b'), persona('c'), persona('d')];
    const tree = buildFamilyTree(personas, [rel('a', 'c'), rel('b', 'c'), rel('a', 'd'), rel('b', 'd')]);
    const slot = (id: string) => tree.nodes.find((n) => n.persona.id === id)!.slot;
    // The couple sits centred over the midpoint of their two children, and the children stay
    // symmetric around that same midpoint.
    const parentsMid = (slot('a') + slot('b')) / 2;
    const childrenMid = (slot('c') + slot('d')) / 2;
    expect(parentsMid).toBeCloseTo(childrenMid);
  });

  it('ignores relationships pointing at a persona that no longer exists in this baúl', () => {
    const personas = [persona('a'), persona('b')];
    const tree = buildFamilyTree(personas, [rel('a', 'b'), rel('a', 'ghost')]);
    expect(tree.nodes.map((n) => n.persona.id).sort()).toEqual(['a', 'b']);
    expect(tree.edges).toEqual([{ parentId: 'a', childId: 'b' }]);
  });
});

describe('buildPersonaFamilyTree', () => {
  it('returns an empty tree for a persona with no relationships at all', () => {
    const tree = buildPersonaFamilyTree([persona('a'), persona('b')], [], 'a');
    expect(tree.nodes).toEqual([]);
  });

  it('only includes the branch the persona belongs to, leaving other families out', () => {
    const personas = ['a', 'b', 'c', 'd'].map((id) => persona(id));
    const tree = buildPersonaFamilyTree(personas, [rel('a', 'b'), rel('c', 'd')], 'a');
    expect(tree.nodes.map((n) => n.persona.id).sort()).toEqual(['a', 'b']);
  });

  it('includes parents, siblings and children, but never grandparents, grandchildren, nieces/nephews or a child\'s other parent', () => {
    const personas = ['grandma', 'mum', 'dad', 'me', 'sister', 'nephew', 'my-kid'].map((id) => persona(id));
    const tree = buildPersonaFamilyTree(personas, [
      rel('grandma', 'mum'), // mum's own parent — my grandparent, must be excluded
      rel('mum', 'me'), rel('dad', 'me'), // my parents
      rel('mum', 'sister'), rel('dad', 'sister'), // my sibling, same two parents
      rel('sister', 'nephew'), // sister's child — my nephew, must be excluded
      rel('me', 'my-kid'), // my own child
    ], 'me');
    expect(tree.nodes.map((n) => n.persona.id).sort()).toEqual(['dad', 'me', 'mum', 'my-kid', 'sister']);
  });

  it('does not include a half-sibling\'s other parent, only the parent shared with this persona', () => {
    const personas = ['mum', 'dad', 'me', 'half-sister', 'other-parent'].map((id) => persona(id));
    const tree = buildPersonaFamilyTree(personas, [
      rel('mum', 'me'), rel('dad', 'me'),
      rel('mum', 'half-sister'), rel('other-parent', 'half-sister'),
    ], 'me');
    expect(tree.nodes.map((n) => n.persona.id).sort()).toEqual(['dad', 'half-sister', 'me', 'mum']);
  });

  it('re-normalises generation and slot to start at 0 for the trimmed-down branch', () => {
    const personas = ['a', 'b', 'c', 'd'].map((id) => persona(id));
    // "c" -> "d" is a second, disconnected component that buildFamilyTree would offset to the
    // right of "a" -> "b" — buildPersonaFamilyTree('b') must undo that offset.
    const tree = buildPersonaFamilyTree(personas, [rel('a', 'b'), rel('c', 'd')], 'b');
    const slotA = tree.nodes.find((n) => n.persona.id === 'a')!.slot;
    const slotB = tree.nodes.find((n) => n.persona.id === 'b')!.slot;
    expect(Math.min(slotA, slotB)).toBe(0);
    expect(tree.nodes.find((n) => n.persona.id === 'a')!.generation).toBe(0);
  });
});
