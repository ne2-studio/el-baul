import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';

vi.mock('@/api', () => ({
  api: {
    baules: {
      setCover: vi.fn(),
    },
  },
}));

import { api } from '@/api';
import { useBaulesStore } from '@/store/useBaulesStore';
import { setBaulCover } from './index';

// Regression coverage for the optimistic-update/rollback pairing in setBaulCover: applies the
// caller-provided thumbnail immediately for instant feedback, then either confirms it with the
// server's response or rolls back to the pre-update snapshot if the request fails. A rollback
// that missed a field, or that failed to rethrow, would leave the UI either silently wrong or
// unaware the change didn't actually happen.
describe('baules useCases setBaulCover', () => {
  const baulId = 'baul-1';
  const photoId = 'photo-1';

  function newBaul(overrides: Partial<ConstructorParameters<typeof Baul>[0]> = {}): Baul {
    const now = new Date().toISOString();
    return new Baul({
      id: baulId,
      name: 'Baúl',
      chapterCount: 1,
      createdAt: now,
      updatedAt: now,
      role: 'administrador',
      isCustodio: true,
      memberCount: 1,
      ...overrides,
    });
  }

  beforeEach(() => {
    useBaulesStore.setState({ baules: [], chapters: {}, photos: {}, loosePhotos: {}, isLoading: false });
    vi.clearAllMocks();
  });

  it('applies the optimistic thumbnail immediately, then replaces it with the server response', async () => {
    useBaulesStore.setState({ baules: [newBaul({ coverPhotoUrl: 'old-thumb' })] });

    let resolveSetCover!: (baul: Baul) => void;
    vi.mocked(api.baules.setCover).mockReturnValue(new Promise((resolve) => { resolveSetCover = resolve; }));

    const promise = setBaulCover(baulId, photoId, 'optimistic-thumb');
    expect(useBaulesStore.getState().baules[0].coverPhotoUrl).toBe('optimistic-thumb');

    const serverBaul = newBaul({ coverPhotoUrl: 'server-thumb' });
    resolveSetCover(serverBaul);
    await promise;

    expect(useBaulesStore.getState().baules[0].coverPhotoUrl).toBe('server-thumb');
  });

  it('rolls back to the previous baules snapshot and rethrows when the request fails', async () => {
    const original = newBaul({ coverPhotoUrl: 'old-thumb' });
    useBaulesStore.setState({ baules: [original] });

    vi.mocked(api.baules.setCover).mockRejectedValue(new Error('server rejected cover'));

    await expect(
      setBaulCover(baulId, photoId, 'optimistic-thumb')
    ).rejects.toThrow('server rejected cover');

    expect(useBaulesStore.getState().baules[0]).toBe(original);
  });
});
