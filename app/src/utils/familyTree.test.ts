import { describe, expect, it } from 'vitest';
import { Persona, PersonaRelationship } from '@/types';
import { buildFamilyTree } from './familyTree';

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
      expect(Number.isInteger(node.slot)).toBe(true);
    }
  });

  it('ignores relationships pointing at a persona that no longer exists in this baúl', () => {
    const personas = [persona('a'), persona('b')];
    const tree = buildFamilyTree(personas, [rel('a', 'b'), rel('a', 'ghost')]);
    expect(tree.nodes.map((n) => n.persona.id).sort()).toEqual(['a', 'b']);
    expect(tree.edges).toEqual([{ parentId: 'a', childId: 'b' }]);
  });
});
