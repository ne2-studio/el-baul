import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Persona } from '@/types';

vi.mock('@/api', () => ({
  api: {
    baules: {
      getPersonas: vi.fn(),
    },
  },
}));

import { api } from '@/api';
import { usePersonasStore } from '@/store/usePersonasStore';
import { loadPersonas } from './index';

// Regression coverage for a bug where loadPersonas swallowed every error — a genuine
// network failure looked identical to "this baúl has no shared people" and never reached
// the caller's toast/Sentry reporting.
describe('people useCases load failures are not swallowed', () => {
  const baulId = 'baul-1';

  beforeEach(() => {
    usePersonasStore.setState({ personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {} });
    vi.clearAllMocks();
  });

  it('loadPersonas rejects and leaves the store untouched when the API call fails', async () => {
    const error = new Error('network down');
    vi.mocked(api.baules.getPersonas).mockRejectedValue(error);

    await expect(loadPersonas(baulId)).rejects.toThrow(error);

    expect(usePersonasStore.getState().personas[baulId]).toBeUndefined();
  });

  it('loadPersonas still stores the result on success', async () => {
    const persona = new Persona({
      id: 'p1',
      baulId,
      nickname: 'Abu',
      status: 'active',
      role: 'colaborador',
      invitedDate: new Date().toISOString(),
      canEdit: true,
    });
    vi.mocked(api.baules.getPersonas).mockResolvedValue([persona]);

    await loadPersonas(baulId);

    expect(usePersonasStore.getState().personas[baulId]).toEqual([persona]);
  });
});
