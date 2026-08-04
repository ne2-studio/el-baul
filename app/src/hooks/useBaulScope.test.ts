// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock('@/store/session', () => ({
  loadUserData: vi.fn(),
}));

vi.mock('@/features/memories/useCases', () => ({
  loadBaulRecuerdos: vi.fn().mockResolvedValue(undefined),
}));

import { useAuth } from 'react-oidc-context';
import { loadUserData } from '@/store/session';
import { loadBaulRecuerdos } from '@/features/memories/useCases';
import { useBaulScope } from './useBaulScope';

const baul = { id: 'baul-1', name: 'Familia García', chapterCount: 0 } as Baul;

describe('useBaulScope', () => {
  beforeEach(() => {
    useBaulesStore.getState().reset();
    useRecuerdosStore.getState().reset();
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    vi.mocked(loadUserData).mockReset();
    vi.mocked(loadBaulRecuerdos).mockClear().mockResolvedValue(undefined);
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
    const loadChapters = vi.fn().mockResolvedValue(undefined);
    const loadLoosePhotos = vi.fn().mockResolvedValue(undefined);
    useBaulesStore.setState({ loadChapters, loadLoosePhotos });

    renderHook(() => useBaulScope('baul-1'));

    await waitFor(() => expect(loadChapters).toHaveBeenCalledWith('baul-1'));
    expect(loadLoosePhotos).toHaveBeenCalledWith('baul-1');
    expect(loadBaulRecuerdos).toHaveBeenCalledWith('baul-1');
  });

  it('only fetches the recuerdos that are missing when chapters are already loaded', async () => {
    useBaulesStore.setState({ baules: [baul], chapters: { 'baul-1': [] } });
    const loadChapters = vi.fn().mockResolvedValue(undefined);
    const loadLoosePhotos = vi.fn().mockResolvedValue(undefined);
    useBaulesStore.setState({ loadChapters, loadLoosePhotos });

    renderHook(() => useBaulScope('baul-1'));

    await waitFor(() => expect(loadBaulRecuerdos).toHaveBeenCalledWith('baul-1'));
    expect(loadChapters).not.toHaveBeenCalled();
    expect(loadLoosePhotos).not.toHaveBeenCalled();
  });

  it('does not refetch anything once chapters and recuerdos are already loaded', async () => {
    useBaulesStore.setState({ baules: [baul], chapters: { 'baul-1': [] }, loosePhotos: { 'baul-1': [] } });
    useRecuerdosStore.setState({ baulRecuerdos: { 'baul-1': [] } });
    const loadChapters = vi.fn().mockResolvedValue(undefined);
    const loadLoosePhotos = vi.fn().mockResolvedValue(undefined);
    useBaulesStore.setState({ loadChapters, loadLoosePhotos });

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
});
