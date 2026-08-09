// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Photo, Recuerdo } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock('@/features/photos/useCases', () => ({
  loadChapterPhotos: vi.fn(),
}));

vi.mock('@/features/memories/useCases', () => ({
  loadChapterRecuerdos: vi.fn(),
}));

import { useAuth } from 'react-oidc-context';
import { loadChapterPhotos } from '@/features/photos/useCases';
import { loadChapterRecuerdos } from '@/features/memories/useCases';
import { useChapterScope } from './useChapterScope';

const baulId = 'baul-1';
const chapterId = 'chapter-1';

function photo(overrides: Partial<Photo> = {}): Photo {
  return { id: 'photo-1', thumbnailUrl: '/thumb.jpg', fullUrl: '/full.jpg', recuerdoCount: 0, ...overrides } as Photo;
}

function recuerdo(overrides: Partial<Recuerdo> = {}): Recuerdo {
  return { id: 'recuerdo-1', text: 'Hola', createdAt: '2026-01-01', ...overrides } as Recuerdo;
}

describe('useChapterScope', () => {
  beforeEach(() => {
    useBaulesStore.getState().reset();
    useRecuerdosStore.getState().reset();
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    vi.mocked(loadChapterPhotos).mockReset().mockResolvedValue(undefined);
    vi.mocked(loadChapterRecuerdos).mockReset().mockResolvedValue(undefined);
  });

  it('does nothing when baulId or chapterId is missing', () => {
    const { result } = renderHook(() => useChapterScope(undefined, chapterId));

    expect(result.current.isLoading).toBe(false);
    expect(loadChapterPhotos).not.toHaveBeenCalled();
    expect(loadChapterRecuerdos).not.toHaveBeenCalled();
  });

  it('loads photos and recuerdos together when neither is cached, and stays loading until both arrive', async () => {
    // Deferred via a microtask (not a synchronous mock body) so isLoading — derived straight
    // from the store, same as useBaulScope/usePersonaScope — can actually be observed as true
    // before these resolve, same as a real network call would behave.
    vi.mocked(loadChapterPhotos).mockImplementation(() => Promise.resolve().then(() => {
      useBaulesStore.setState((state) => ({ photos: { ...state.photos, [chapterId]: [photo()] } }));
    }));
    vi.mocked(loadChapterRecuerdos).mockImplementation(() => Promise.resolve().then(() => {
      useRecuerdosStore.setState((state) => ({ chapterRecuerdos: { ...state.chapterRecuerdos, [chapterId]: [recuerdo()] } }));
    }));

    const { result } = renderHook(() => useChapterScope(baulId, chapterId));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(loadChapterPhotos).toHaveBeenCalledWith(chapterId));
    expect(loadChapterRecuerdos).toHaveBeenCalledWith(baulId, chapterId);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.photos).toEqual([photo()]);
    expect(result.current.chapterRecuerdos).toEqual([recuerdo()]);
    expect(result.current.loadFailed).toBe(false);
  });

  it('only fetches the piece that is missing', async () => {
    useBaulesStore.setState((state) => ({ photos: { ...state.photos, [chapterId]: [photo()] } }));

    renderHook(() => useChapterScope(baulId, chapterId));

    await waitFor(() => expect(loadChapterRecuerdos).toHaveBeenCalledWith(baulId, chapterId));
    expect(loadChapterPhotos).not.toHaveBeenCalled();
  });

  it('does not refetch anything once both are already cached', async () => {
    useBaulesStore.setState((state) => ({ photos: { ...state.photos, [chapterId]: [photo()] } }));
    useRecuerdosStore.setState((state) => ({ chapterRecuerdos: { ...state.chapterRecuerdos, [chapterId]: [] } }));

    const { result } = renderHook(() => useChapterScope(baulId, chapterId));

    await act(async () => {
      await Promise.resolve();
    });
    expect(loadChapterPhotos).not.toHaveBeenCalled();
    expect(loadChapterRecuerdos).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.photos).toEqual([photo()]);
  });

  it('surfaces loadFailed when the fetch fails, and retry can recover', async () => {
    vi.mocked(loadChapterRecuerdos).mockRejectedValueOnce(new Error('network down'));
    useBaulesStore.setState((state) => ({ photos: { ...state.photos, [chapterId]: [photo()] } }));

    const { result } = renderHook(() => useChapterScope(baulId, chapterId));

    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(result.current.isLoading).toBe(false);

    vi.mocked(loadChapterRecuerdos).mockImplementationOnce(async () => {
      useRecuerdosStore.setState((state) => ({ chapterRecuerdos: { ...state.chapterRecuerdos, [chapterId]: [recuerdo()] } }));
    });

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.loadFailed).toBe(false);
  });

  it('does nothing while unauthenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);

    renderHook(() => useChapterScope(baulId, chapterId));

    await act(async () => {
      await Promise.resolve();
    });
    expect(loadChapterPhotos).not.toHaveBeenCalled();
    expect(loadChapterRecuerdos).not.toHaveBeenCalled();
  });

  // Regression: navigating straight from one chapter to another (e.g. BatchPhotoActionsContainer
  // moving photos and then navigating to the target chapter's URL) keeps ChapterRoute — and this
  // hook — mounted; only chapterId changes. If chapter A's fetch is still in flight at that
  // point, its eventual (successful) resolution must not be mistaken for chapter B's.
  it('never reports "ready" for a chapter whose data was never actually fetched, even when a stale fetch for the previous chapter resolves afterwards', async () => {
    const chapterA = 'chapter-a';
    const chapterB = 'chapter-b';
    let resolveAPhotos: () => void = () => {};
    let resolveARecuerdos: () => void = () => {};

    vi.mocked(loadChapterPhotos).mockImplementation((id: string) => {
      if (id === chapterA) {
        return new Promise<void>((resolve) => {
          resolveAPhotos = () => {
            useBaulesStore.setState((state) => ({ photos: { ...state.photos, [chapterA]: [photo()] } }));
            resolve();
          };
        });
      }
      return Promise.resolve().then(() => {
        useBaulesStore.setState((state) => ({ photos: { ...state.photos, [id]: [photo()] } }));
      });
    });
    vi.mocked(loadChapterRecuerdos).mockImplementation((_baulId: string, id: string) => {
      if (id === chapterA) {
        return new Promise<void>((resolve) => {
          resolveARecuerdos = () => {
            useRecuerdosStore.setState((state) => ({ chapterRecuerdos: { ...state.chapterRecuerdos, [chapterA]: [] } }));
            resolve();
          };
        });
      }
      return Promise.resolve().then(() => {
        useRecuerdosStore.setState((state) => ({ chapterRecuerdos: { ...state.chapterRecuerdos, [id]: [] } }));
      });
    });

    const { result, rerender } = renderHook(
      ({ chapterId }: { chapterId: string }) => useChapterScope(baulId, chapterId),
      { initialProps: { chapterId: chapterA } }
    );

    expect(result.current.isLoading).toBe(true);

    // Navigate to chapter B before chapter A's own fetch has resolved.
    rerender({ chapterId: chapterB });

    // Chapter A's stale fetch finally resolves successfully.
    await act(async () => {
      resolveAPhotos();
      resolveARecuerdos();
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // The hook must not claim "ready, no error" for chapter B unless chapter B's own data was
    // actually fetched — reporting success off the back of chapter A's stale resolution leaves
    // ChapterRoute's guard stuck showing a full-screen loader forever (isLoading false,
    // loadFailed false, but photos/chapterRecuerdos still undefined for the chapter on screen).
    expect(result.current.loadFailed || (!!result.current.photos && !!result.current.chapterRecuerdos)).toBe(true);
  });
});
