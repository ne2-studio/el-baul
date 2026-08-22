// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock('@/features/auth/useCases', () => ({
  loadUserData: vi.fn(),
}));

vi.mock('@/api', () => ({
  api: { baules: { getScope: vi.fn() } },
}));

import { useAuth } from 'react-oidc-context';
import { loadUserData } from '@/features/auth/useCases';
import { api } from '@/api';
import { useBaulScope } from './useBaulScope';

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 0 } as Baul;

// getScope's own response shape — see baulesApi.getScope. Overridable per test; a blank scope
// is enough to satisfy hasScope for the pieces every baúl always needs.
function emptyScope(overrides: Partial<Awaited<ReturnType<typeof api.baules.getScope>>> = {}) {
  return {
    baul,
    chapters: [],
    loosePhotos: [],
    recuerdos: [],
    personas: [],
    removalRequests: null,
    baulFeed: null,
    ...overrides,
  };
}

describe('useBaulScope', () => {
  beforeEach(() => {
    // React logs errors thrown/rejected inside effects to console.error even when the
    // hook handles them correctly (see refreshFailed tests below) — silence the noise.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    useBaulesStore.getState().reset();
    usePersonasStore.getState().reset();
    useRecuerdosStore.getState().reset();
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    vi.mocked(loadUserData).mockReset();
    vi.mocked(api.baules.getScope).mockReset().mockResolvedValue(emptyScope());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when there is no baulId', () => {
    const { result } = renderHook(() => useBaulScope(undefined));

    expect(result.current.baul).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(loadUserData).not.toHaveBeenCalled();
  });

  it('refreshes user data when the baúl is missing from the store', async () => {
    vi.mocked(loadUserData).mockImplementation(async () => {
      useBaulesStore.setState({ baules: [baul] });
    });

    const { result } = renderHook(() => useBaulScope('baul-1'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(loadUserData).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.baul).toEqual(baul));
    expect(result.current.refreshFailed).toBe(false);
  });

  it('surfaces refreshFailed when the retry to load the baúl fails', async () => {
    vi.mocked(loadUserData).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useBaulScope('missing-baul'));

    await waitFor(() => expect(result.current.refreshFailed).toBe(true));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.baul).toBeUndefined();
  });

  it('loads chapters, loose photos, recuerdos and personas in one request when the baúl is present but nothing else is', async () => {
    useBaulesStore.setState({ baules: [baul] });

    const { result } = renderHook(() => useBaulScope('baul-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // includeBaulFeed defaults to false when the caller didn't opt in.
    expect(api.baules.getScope).toHaveBeenCalledWith('baul-1', false);
    expect(api.baules.getScope).toHaveBeenCalledTimes(1);
    expect(result.current.chapters).toEqual([]);
    expect(result.current.baulRecuerdos).toEqual([]);
    expect(result.current.personas).toEqual([]);
  });

  it('asks the server to include the feed when the caller opts in', async () => {
    useBaulesStore.setState({ baules: [baul] });
    vi.mocked(api.baules.getScope).mockResolvedValue(
      emptyScope({ baulFeed: { feedItems: [], hasMore: false } })
    );

    renderHook(() => useBaulScope('baul-1', { includeBaulFeed: true }));

    await waitFor(() => expect(api.baules.getScope).toHaveBeenCalledWith('baul-1', true));
  });

  it('stores removal requests when the server includes them (canReviewRemovalRequests)', async () => {
    const adminBaul = { ...baul, isCustodio: true } as Baul;
    useBaulesStore.setState({ baules: [adminBaul] });
    vi.mocked(api.baules.getScope).mockResolvedValue(emptyScope({ removalRequests: [] }));

    const { result } = renderHook(() => useBaulScope('baul-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.removalRequests).toEqual([]);
  });

  it('does not refetch anything once chapters, recuerdos and personas are already loaded', async () => {
    useBaulesStore.setState({ baules: [baul], chapters: { 'baul-1': [] }, loosePhotos: { 'baul-1': [] } });
    usePersonasStore.setState({ personas: { 'baul-1': [] } });
    useRecuerdosStore.setState({ baulRecuerdos: { 'baul-1': [] } });

    renderHook(() => useBaulScope('baul-1'));

    // Nothing async to await on here — assert after letting pending microtasks flush.
    await act(async () => {
      await Promise.resolve();
    });
    expect(api.baules.getScope).not.toHaveBeenCalled();
  });

  it('does nothing while unauthenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);

    renderHook(() => useBaulScope('baul-1'));

    await act(async () => {
      await Promise.resolve();
    });
    expect(loadUserData).not.toHaveBeenCalled();
  });

  // Regression: switching baúles (e.g. via the workspace selector) while the previous baúl's
  // scope fetch is still in flight must not have the new baúl's own fetch silently dropped
  // because the previous one — for a *different* id — hasn't resolved yet.
  it('fetches the new baúl even while the previous baúl\'s fetch is still in flight', async () => {
    const baulA = { id: 'baul-a', name: 'Baúl A', chapterCount: 0 } as Baul;
    const baulB = { id: 'baul-b', name: 'Baúl B', chapterCount: 0 } as Baul;
    let resolveA: () => void = () => {};

    useBaulesStore.setState({ baules: [baulA, baulB] });
    vi.mocked(api.baules.getScope).mockImplementation((id: string) => {
      if (id === baulA.id) {
        return new Promise((resolve) => {
          resolveA = () => resolve(emptyScope({ baul: baulA }));
        });
      }
      return Promise.resolve(emptyScope({ baul: baulB }));
    });

    const { result, rerender } = renderHook(
      ({ baulId }: { baulId: string }) => useBaulScope(baulId),
      { initialProps: { baulId: baulA.id } }
    );

    expect(result.current.isLoading).toBe(true);

    rerender({ baulId: baulB.id });

    await waitFor(() => expect(api.baules.getScope).toHaveBeenCalledWith(baulB.id, false));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.chapters).toEqual([]);
    expect(result.current.refreshFailed).toBe(false);

    resolveA();
  });

  it('ignores a failed fetch for the previous baúl after navigating to a loaded one', async () => {
    const baulA = { id: 'baul-a', name: 'Baúl A', chapterCount: 0 } as Baul;
    const baulB = { id: 'baul-b', name: 'Baúl B', chapterCount: 0 } as Baul;
    let rejectA: (error: Error) => void = () => {};

    useBaulesStore.setState({ baules: [baulA, baulB] });
    vi.mocked(api.baules.getScope).mockImplementation((id: string) => {
      if (id === baulA.id) {
        return new Promise((_resolve, reject) => {
          rejectA = reject;
        });
      }
      return Promise.resolve(emptyScope({ baul: baulB }));
    });

    const { result, rerender } = renderHook(
      ({ baulId }: { baulId: string }) => useBaulScope(baulId),
      { initialProps: { baulId: baulA.id } }
    );

    rerender({ baulId: baulB.id });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      rejectA(new Error('old baúl failed'));
      await Promise.resolve();
    });

    expect(result.current.baul).toEqual(baulB);
    expect(result.current.refreshFailed).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});
