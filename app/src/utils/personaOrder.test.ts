import { describe, expect, it } from 'vitest';
import { Persona } from '../types';
import { sortPersonasForInvite, sortPersonasForTagging } from './personaOrder';

function persona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: overrides.nickname ?? 'p',
    baulId: 'baul-1',
    nickname: 'Ana',
    status: 'active',
    role: 'colaborador',
    isCustodio: false,
    invitedDate: 'hace 1 día',
    ...overrides,
  } as Persona;
}

describe('sortPersonasForInvite', () => {
  it('puts pending personas first, active ones after, alphabetical within each group', () => {
    const personas = [
      persona({ nickname: 'Zoe', status: 'active' }),
      persona({ nickname: 'Bea', status: 'pending' }),
      persona({ nickname: 'Ana', status: 'active' }),
      persona({ nickname: 'Álvaro', status: 'pending' }),
    ];

    const result = sortPersonasForInvite(personas).map((p) => p.nickname);

    expect(result).toEqual(['Álvaro', 'Bea', 'Ana', 'Zoe']);
  });
});

describe('sortPersonasForTagging', () => {
  it('puts active personas first, pending ones after, alphabetical within each group', () => {
    const personas = [
      persona({ nickname: 'Zoe', status: 'active' }),
      persona({ nickname: 'Bea', status: 'pending' }),
      persona({ nickname: 'Ana', status: 'active' }),
      persona({ nickname: 'Álvaro', status: 'pending' }),
    ];

    const result = sortPersonasForTagging(personas).map((p) => p.nickname);

    expect(result).toEqual(['Ana', 'Zoe', 'Álvaro', 'Bea']);
  });
});
