import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Recuerdo } from '@/types';

vi.mock('@/api', () => ({
  api: {
    recuerdos: {
      create: vi.fn(),
      createForAlbum: vi.fn(),
    },
  },
}));

import { api } from '@/api';
import { useAppStore } from './useAppStore';

// Regression coverage for a bug where adding a recuerdo from a photo or a chapter never
// showed up in the baúl-wide "Recuerdos" tab until the baúl page was reloaded: addRecuerdo
// and addAlbumRecuerdo only ever patched their own narrow cache (recuerdos[photoId] /
// albumRecuerdos[albumId]), never baulRecuerdos[baulId] — the tab's own load is skipped
// once that cache has *any* value, so it never noticed the addition happened elsewhere.
describe('useAppStore recuerdo caches stay in sync', () => {
  const baulId = 'baul-1';
  const photoId = 'photo-1';
  const albumId = 'album-1';

  beforeEach(() => {
    useAppStore.setState({ recuerdos: {}, albumRecuerdos: {}, baulRecuerdos: {} });
    vi.clearAllMocks();
  });

  function newRecuerdo(id: string, overrides: Partial<Recuerdo> = {}): Recuerdo {
    return new Recuerdo({
      id,
      text: 'hola',
      userName: 'Pedro',
      createdAt: new Date().toISOString(),
      ...overrides,
    });
  }

  it('addRecuerdo patches baulRecuerdos when the baúl-level tab was already loaded', async () => {
    const existing = newRecuerdo('existing');
    useAppStore.setState({ baulRecuerdos: { [baulId]: [existing] } });

    const created = newRecuerdo('new', { photoId });
    vi.mocked(api.recuerdos.create).mockResolvedValue(created);

    await useAppStore.getState().addRecuerdo(baulId, photoId, 'hola');

    expect(useAppStore.getState().recuerdos[photoId]).toEqual([created]);
    expect(useAppStore.getState().baulRecuerdos[baulId]).toEqual([created, existing]);
  });

  it('addRecuerdo does not fabricate a partial baulRecuerdos entry when the tab was never loaded', async () => {
    const created = newRecuerdo('new', { photoId });
    vi.mocked(api.recuerdos.create).mockResolvedValue(created);

    await useAppStore.getState().addRecuerdo(baulId, photoId, 'hola');

    expect(useAppStore.getState().recuerdos[photoId]).toEqual([created]);
    expect(useAppStore.getState().baulRecuerdos[baulId]).toBeUndefined();
  });

  it('addAlbumRecuerdo patches baulRecuerdos when the baúl-level tab was already loaded', async () => {
    const existing = newRecuerdo('existing');
    useAppStore.setState({ baulRecuerdos: { [baulId]: [existing] } });

    const created = newRecuerdo('new', { albumId });
    vi.mocked(api.recuerdos.createForAlbum).mockResolvedValue(created);

    await useAppStore.getState().addAlbumRecuerdo(baulId, albumId, 'hola');

    expect(useAppStore.getState().albumRecuerdos[albumId]).toEqual([created]);
    expect(useAppStore.getState().baulRecuerdos[baulId]).toEqual([created, existing]);
  });

  it('addAlbumRecuerdo does not fabricate a partial baulRecuerdos entry when the tab was never loaded', async () => {
    const created = newRecuerdo('new', { albumId });
    vi.mocked(api.recuerdos.createForAlbum).mockResolvedValue(created);

    await useAppStore.getState().addAlbumRecuerdo(baulId, albumId, 'hola');

    expect(useAppStore.getState().albumRecuerdos[albumId]).toEqual([created]);
    expect(useAppStore.getState().baulRecuerdos[baulId]).toBeUndefined();
  });
});
