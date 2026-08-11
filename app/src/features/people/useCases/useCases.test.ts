import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Persona } from '@/types';

vi.mock('@/api', () => ({
  api: {
    baules: {
      getPersonas: vi.fn(),
      setPersonaAvatarPhoto: vi.fn(),
      createPersona: vi.fn(),
    },
  },
}));

import { api } from '@/api';
import { usePersonasStore } from '@/store/usePersonasStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { createPersona, loadPersonas, setPersonaAvatarPhoto } from './index';

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
      role: 'colaborador', isCustodio: false,
      invitedDate: new Date().toISOString(),
      canEdit: true,
    });
    vi.mocked(api.baules.getPersonas).mockResolvedValue([persona]);

    await loadPersonas(baulId);

    expect(usePersonasStore.getState().personas[baulId]).toEqual([persona]);
  });
});

describe('createPersona', () => {
  const baulId = 'baul-1';

  beforeEach(() => {
    usePersonasStore.setState({ personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {} });
    vi.clearAllMocks();
  });

  it('appends the created persona to the baúl\'s cached list', async () => {
    const existing = new Persona({
      id: 'p1', baulId, nickname: 'Abu', status: 'active', role: 'colaborador', isCustodio: false,
      invitedDate: new Date().toISOString(), canEdit: true,
    });
    const created = new Persona({
      id: 'p2', baulId, nickname: 'Tío Juan', status: 'active', role: 'colaborador', isCustodio: false,
      invitedDate: new Date().toISOString(), canEdit: true,
    });
    usePersonasStore.setState({ personas: { [baulId]: [existing] } });
    vi.mocked(api.baules.createPersona).mockResolvedValue(created);

    await createPersona(baulId, 'Tío Juan');

    expect(api.baules.createPersona).toHaveBeenCalledWith(baulId, 'Tío Juan');
    expect(usePersonasStore.getState().personas[baulId]).toEqual([existing, created]);
  });
});

describe('setPersonaAvatarPhoto', () => {
  const baulId = 'baul-1';

  beforeEach(() => {
    usePersonasStore.setState({ personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {} });
    usePhotosStore.setState({ photosById: {} });
    vi.clearAllMocks();
  });

  it('updates the persona and adds the selected photo to the persona gallery cache', async () => {
    const previous = new Persona({
      id: 'p1',
      baulId,
      nickname: 'Abu',
      status: 'active',
      role: 'colaborador', isCustodio: false,
      invitedDate: new Date().toISOString(),
      canEdit: true,
    });
    const updated = new Persona({
      id: 'p1',
      baulId,
      nickname: 'Abu',
      status: 'active',
      role: 'colaborador', isCustodio: false,
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
    expect(usePersonasStore.getState().personaPhotos.p1).toEqual([photo.id]);
    expect(usePhotosStore.getState().photosById[photo.id]).toEqual(photo);
  });

  it('does not duplicate the photo id in the cache when it is already there', async () => {
    const updated = new Persona({
      id: 'p1', baulId, nickname: 'Abu', status: 'active', role: 'colaborador', isCustodio: false,
      invitedDate: new Date().toISOString(), canEdit: true, avatarPhotoId: 'photo-1',
    });
    const photo = { id: 'photo-1', thumbnailUrl: 'thumb', fullUrl: 'full', recuerdoCount: 0 };
    usePersonasStore.setState({
      personas: { [baulId]: [updated] },
      personaPhotos: { p1: ['photo-1', 'photo-2'] },
    });
    vi.mocked(api.baules.setPersonaAvatarPhoto).mockResolvedValue(updated);

    await setPersonaAvatarPhoto(baulId, 'p1', photo, { x: 0.5, y: 0.5, scale: 1 });

    expect(usePersonasStore.getState().personaPhotos.p1).toEqual(['photo-1', 'photo-2']);
  });
});
