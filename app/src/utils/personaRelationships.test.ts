import { describe, expect, it } from 'vitest';
import { Persona } from '../types';
import { filterCandidatesForDirection } from './personaRelationships';

const persona = (id: string, nickname: string): Persona => ({ id, nickname, name: nickname } as Persona);

describe('filterCandidatesForDirection', () => {
  const child = persona('child-1', 'Ya Hijo');
  const parent = persona('parent-1', 'Ya Padre');
  const spouse = persona('spouse-1', 'Ya Cónyuge');
  const stranger = persona('stranger-1', 'Desconocido');
  const candidates = [child, parent, spouse, stranger];

  it('excludes existing children for the parent direction', () => {
    const result = filterCandidatesForDirection(candidates, 'parent', [parent], [child], null);
    expect(result).toEqual([parent, spouse, stranger]);
  });

  it('excludes existing parents for the child direction', () => {
    const result = filterCandidatesForDirection(candidates, 'child', [parent], [child], null);
    expect(result).toEqual([child, spouse, stranger]);
  });

  it('excludes the existing spouse for the spouse direction', () => {
    const result = filterCandidatesForDirection(candidates, 'spouse', [], [], spouse);
    expect(result).toEqual([child, parent, stranger]);
  });

  it('excludes nobody for the spouse direction when there is no existing spouse', () => {
    const result = filterCandidatesForDirection(candidates, 'spouse', [], [], null);
    expect(result).toEqual(candidates);
  });
});
