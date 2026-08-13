// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock('@/features/auth/useCases', () => ({
  loadUserData: vi.fn(),
}));

vi.mock('@/features/memories/useCases', () => ({
  loadBaulRecuerdos: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/baules/useCases', () => ({
  loadChapters: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/photos/useCases', () => ({
  loadLoosePhotos: vi.fn().mockResolvedValue(undefined),
}));

import { useAuth } from 'react-oidc-context';
import { loadUserData } from '@/features/auth/useCases';
import { loadBaulRecuerdos } from '@/features/memories/useCases';
import { loadChapters } from '@/features/baules/useCases';
import { loadLoosePhotos } from '@/features/photos/useCases';
import { useBaulScope } from './useBaulScope';

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 0 } as Baul;

describe('useBaulScope', () => {
  beforeEach(() => {
    // React logs errors thrown/rejected inside effects to console.error even when the
    // hook handles them correctly (see refreshFailed tests below) — silence the noise.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    useBaulesStore.getState().reset();
    useRecuerdosStore.getState().reset();
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    vi.mocked(loadUserData).mockReset();
    vi.mocked(loadBaulRecuerdos).mockClear().mockResolvedValue(undefined);
    vi.mocked(loadChapters).mockClear().mockResolvedValue(undefined);
    vi.mocked(loadLoosePhotos).mockClear().mockResolvedValue(undefined);
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

  it('loads chapters, loose photos and recuerdos when the baúl is present but nothing else is', async () => {
    useBaulesStore.setState({ baules: [baul] });

    renderHook(() => useBaulScope('baul-1'));

    await waitFor(() => expect(loadChapters).toHaveBeenCalledWith('baul-1'));
    expect(loadLoosePhotos).toHaveBeenCalledWith('baul-1');
    expect(loadBaulRecuerdos).toHaveBeenCalledWith('baul-1');
  });

  it('only fetches the recuerdos that are missing when chapters are already loaded', async () => {
    useBaulesStore.setState({ baules: [baul], chapters: { 'baul-1': [] } });

    renderHook(() => useBaulScope('baul-1'));

    await waitFor(() => expect(loadBaulRecuerdos).toHaveBeenCalledWith('baul-1'));
    expect(loadChapters).not.toHaveBeenCalled();
    expect(loadLoosePhotos).not.toHaveBeenCalled();
  });

  it('does not refetch anything once chapters and recuerdos are already loaded', async () => {
    useBaulesStore.setState({ baules: [baul], chapters: { 'baul-1': [] }, loosePhotos: { 'baul-1': [] } });
    useRecuerdosStore.setState({ baulRecuerdos: { 'baul-1': [] } });

    renderHook(() => useBaulScope('baul-1'));

    // Nothing async to await on here — assert after letting pending microtasks flush.
    await act(async () => {
      await Promise.resolve();
    });
    expect(loadChapters).not.toHaveBeenCalled();
    expect(loadLoosePhotos).not.toHaveBeenCalled();
    expect(loadBaulRecuerdos).not.toHaveBeenCalled();
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
  // chapters/recuerdos fetch is still in flight must not have the new baúl's own fetch
  // silently dropped because the previous one — for a *different* id — hasn't resolved yet.
  it('fetches the new baúl even while the previous baúl\'s fetch is still in flight', async () => {
    const baulA = { id: 'baul-a', name: 'Baúl A', chapterCount: 0 } as Baul;
    const baulB = { id: 'baul-b', name: 'Baúl B', chapterCount: 0 } as Baul;
    let resolveA: () => void = () => {};

    useBaulesStore.setState({ baules: [baulA, baulB] });
    // Resolves immediately for whichever baúl is asked, so hasScope (which also needs
    // baulRecuerdos, not just chapters) can become true for baulB.
    vi.mocked(loadBaulRecuerdos).mockImplementation((id: string) => {
      useRecuerdosStore.setState((state) => ({ baulRecuerdos: { ...state.baulRecuerdos, [id]: [] } }));
      return Promise.resolve();
    });

    vi.mocked(loadChapters).mockImplementation((id: string) => {
      if (id === baulA.id) {
        return new Promise<void>((resolve) => {
          resolveA = () => {
            useBaulesStore.setState((state) => ({ chapters: { ...state.chapters, [baulA.id]: [] } }));
            resolve();
          };
        });
      }
      return Promise.resolve().then(() => {
        useBaulesStore.setState((state) => ({ chapters: { ...state.chapters, [id]: [] } }));
      });
    });

    const { result, rerender } = renderHook(
      ({ baulId }: { baulId: string }) => useBaulScope(baulId),
      { initialProps: { baulId: baulA.id } }
    );

    expect(result.current.isLoading).toBe(true);

    rerender({ baulId: baulB.id });

    await waitFor(() => expect(loadChapters).toHaveBeenCalledWith(baulB.id));
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
    vi.mocked(loadBaulRecuerdos).mockImplementation((id: string) => {
      useRecuerdosStore.setState((state) => ({ baulRecuerdos: { ...state.baulRecuerdos, [id]: [] } }));
      return Promise.resolve();
    });
    vi.mocked(loadChapters).mockImplementation((id: string) => {
      if (id === baulA.id) {
        return new Promise<void>((_resolve, reject) => {
          rejectA = reject;
        });
      }
      return Promise.resolve().then(() => {
        useBaulesStore.setState((state) => ({ chapters: { ...state.chapters, [id]: [] } }));
      });
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
