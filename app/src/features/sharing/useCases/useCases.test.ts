import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Persona, RemovalRequest } from '@/types';

vi.mock('@/api', () => ({
  api: {
    baules: {
      getRemovalRequests: vi.fn(),
      setPersonaAvatarPhoto: vi.fn(),
    },
  },
}));

import { api } from '@/api';
import { usePersonasStore } from '@/store/usePersonasStore';
import { loadRemovalRequests, setPersonaAvatarPhoto } from './index';

const baulId = 'baul-1';

beforeEach(() => {
  usePersonasStore.setState({ personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {} });
  vi.clearAllMocks();
});

// Regression coverage for a bug where loadRemovalRequests swallowed every error — a genuine
// network failure looked identical to "this baúl has no pending requests" and never reached
// the caller's toast/Sentry reporting.
describe('sharing useCases load failures are not swallowed', () => {
  it('loadRemovalRequests rejects and leaves the store untouched when the API call fails', async () => {
    const error = new Error('network down');
    vi.mocked(api.baules.getRemovalRequests).mockRejectedValue(error);

    await expect(loadRemovalRequests(baulId)).rejects.toThrow(error);

    expect(usePersonasStore.getState().removalRequests[baulId]).toBeUndefined();
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

    await loadRemovalRequests(baulId);

    expect(usePersonasStore.getState().removalRequests[baulId]).toEqual([request]);
  });
});

describe('setPersonaAvatarPhoto', () => {
  it('updates the persona and adds the selected photo to the persona gallery cache', async () => {
    const previous = new Persona({
      id: 'p1',
      baulId,
      nickname: 'Abu',
      status: 'active',
      role: 'colaborador',
      invitedDate: new Date().toISOString(),
      canEdit: true,
    });
    const updated = new Persona({
      id: 'p1',
      baulId,
      nickname: 'Abu',
      status: 'active',
      role: 'colaborador',
      invitedDate: new Date().toISOString(),
      canEdit: true,
      avatarPhotoId: 'photo-1',
      avatarUrl: 'avatar-url',
      avatarCropX: 0.25,
      avatarCropY: 0.75,
      avatarCropScale: 2,
    });
    const photo = {
      id: 'photo-1',
      thumbnailUrl: 'thumb',
      fullUrl: 'full',
      recuerdoCount: 0,
    };
    usePersonasStore.setState({ personas: { [baulId]: [previous] }, personaPhotos: { p1: [] } });
    vi.mocked(api.baules.setPersonaAvatarPhoto).mockResolvedValue(updated);

    await setPersonaAvatarPhoto(baulId, 'p1', photo, { x: 0.25, y: 0.75, scale: 2 });

    expect(api.baules.setPersonaAvatarPhoto).toHaveBeenCalledWith(baulId, 'p1', 'photo-1', { x: 0.25, y: 0.75, scale: 2 });
    expect(usePersonasStore.getState().personas[baulId]).toEqual([updated]);
    expect(usePersonasStore.getState().personaPhotos.p1).toEqual([photo]);
  });
});
