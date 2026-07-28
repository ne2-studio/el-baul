import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Persona, RemovalRequest } from '@/types';

vi.mock('@/api', () => ({
  api: {
    baules: {
      getPersonas: vi.fn(),
      getRemovalRequests: vi.fn(),
    },
  },
}));

import { api } from '@/api';
import { usePersonasStore } from './usePersonasStore';

// Regression coverage for a bug where loadPersonas/loadRemovalRequests swallowed every
// error — a genuine network failure looked identical to "this baúl has no shared people /
// no pending requests" and never reached the caller's toast/Sentry reporting.
describe('usePersonasStore load failures are not swallowed', () => {
  const baulId = 'baul-1';

  beforeEach(() => {
    usePersonasStore.setState({ personas: {}, removalRequests: {} });
    vi.clearAllMocks();
  });

  it('loadPersonas rejects and leaves the store untouched when the API call fails', async () => {
    const error = new Error('network down');
    vi.mocked(api.baules.getPersonas).mockRejectedValue(error);

    await expect(usePersonasStore.getState().loadPersonas(baulId)).rejects.toThrow(error);

    expect(usePersonasStore.getState().personas[baulId]).toBeUndefined();
  });

  it('loadRemovalRequests rejects and leaves the store untouched when the API call fails', async () => {
    const error = new Error('network down');
    vi.mocked(api.baules.getRemovalRequests).mockRejectedValue(error);

    await expect(usePersonasStore.getState().loadRemovalRequests(baulId)).rejects.toThrow(error);

    expect(usePersonasStore.getState().removalRequests[baulId]).toBeUndefined();
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

    await usePersonasStore.getState().loadPersonas(baulId);

    expect(usePersonasStore.getState().personas[baulId]).toEqual([persona]);
  });

  it('loadRemovalRequests still stores the result on success', async () => {
    const request = new RemovalRequest({
      id: 'r1',
      baulId,
      photoId: 'photo-1',
      photoUrl: 'url',
      requesterName: 'Pedro',
      requesterEmail: 'pedro@example.com',
      reason: 'blurry',
      requestDate: new Date().toISOString(),
      status: 'pending',
    });
    vi.mocked(api.baules.getRemovalRequests).mockResolvedValue([request]);

    await usePersonasStore.getState().loadRemovalRequests(baulId);

    expect(usePersonasStore.getState().removalRequests[baulId]).toEqual([request]);
  });
});
