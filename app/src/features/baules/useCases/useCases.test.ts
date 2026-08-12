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
import { useAuthStore } from '@/store/useAuthStore';
import { useCurrentBaulStore } from '@/store/useCurrentBaulStore';
import { decideHomeDestination, resolveHomeDestination, setBaulCover } from './index';

describe('baules useCases decideHomeDestination', () => {
  it.each([
    { hasSeenOnboarding: false, expected: '/onboarding' },
    { hasSeenOnboarding: null, expected: '/onboarding' },
    { hasSeenOnboarding: true, expected: '/baules/nuevo' },
  ])('sends users without baúles to $expected when hasSeenOnboarding is $hasSeenOnboarding', ({ hasSeenOnboarding, expected }) => {
    expect(decideHomeDestination({
      baulIds: [],
      currentBaulId: null,
      hasSeenOnboarding,
    })).toEqual({
      destination: expected,
      currentBaulId: null,
    });
  });

  it('keeps the remembered baúl when it is still available', () => {
    expect(decideHomeDestination({
      baulIds: ['baul-1', 'baul-2'],
      currentBaulId: 'baul-2',
      hasSeenOnboarding: true,
    })).toEqual({
      destination: '/baules/baul-2',
      currentBaulId: 'baul-2',
    });
  });

  it.each([
    { currentBaulId: null },
    { currentBaulId: 'baul-from-another-account' },
  ])('falls back to the first baúl when currentBaulId is $currentBaulId', ({ currentBaulId }) => {
    expect(decideHomeDestination({
      baulIds: ['baul-1', 'baul-2'],
      currentBaulId,
      hasSeenOnboarding: false,
    })).toEqual({
      destination: '/baules/baul-1',
      currentBaulId: 'baul-1',
    });
  });
});

describe('baules useCases resolveHomeDestination', () => {
  function newBaul(id: string): Baul {
    const now = new Date().toISOString();
    return new Baul({
      id,
      name: 'Baúl',
      chapterCount: 1,
      createdAt: now,
      updatedAt: now,
      role: 'administrador',
      isCustodio: true,
      memberCount: 1,
    });
  }

  beforeEach(() => {
    useAuthStore.getState().reset();
    useCurrentBaulStore.setState({ currentBaulId: null });
  });

  it('persists the resolved current baúl when the remembered one is missing', () => {
    const destination = resolveHomeDestination([newBaul('baul-1'), newBaul('baul-2')]);

    expect(destination).toBe('/baules/baul-1');
    expect(useCurrentBaulStore.getState().currentBaulId).toBe('baul-1');
  });

  it('uses hasSeenOnboarding from auth state for users without baúles', () => {
    useAuthStore.getState().setHasSeenOnboarding(true);

    expect(resolveHomeDestination([])).toBe('/baules/nuevo');
    expect(useCurrentBaulStore.getState().currentBaulId).toBeNull();
  });
});

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

    const promise = setBaulCover(baulId, photoId, { x: 0.5, y: 0.5, scale: 1 }, 'optimistic-thumb');
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
      setBaulCover(baulId, photoId, { x: 0.5, y: 0.5, scale: 1 }, 'optimistic-thumb')
    ).rejects.toThrow('server rejected cover');

    expect(useBaulesStore.getState().baules[0]).toBe(original);
  });
});
