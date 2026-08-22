// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Photo, Recuerdo } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock('@/api', () => ({
  api: { chapters: { getScope: vi.fn() } },
}));

import { useAuth } from 'react-oidc-context';
import { api } from '@/api';
import { useChapterScope } from './useChapterScope';

const baulId = 'baul-1';
const chapterId = 'chapter-1';

function photo(overrides: Partial<Photo> = {}): Photo {
  return { id: 'photo-1', thumbnailUrl: '/thumb.jpg', fullUrl: '/full.jpg', recuerdoCount: 0, ...overrides } as Photo;
}

function recuerdo(overrides: Partial<Recuerdo> = {}): Recuerdo {
  return { id: 'recuerdo-1', text: 'Hola', createdAt: '2026-01-01', ...overrides } as Recuerdo;
}

// Seeds both halves of the normalized photo cache: the chapter's id list (useBaulesStore) and
// the canonical objects it resolves against (usePhotosStore) — see usePhotosStore.hydratePhotos.
function seedChapterPhotos(forChapterId: string, photos: Photo[]): void {
  usePhotosStore.getState().upsertPhotos(photos);
  useBaulesStore.setState((state) => ({
    photos: { ...state.photos, [forChapterId]: photos.map((p) => p.id) },
  }));
}

describe('useChapterScope', () => {
  beforeEach(() => {
    // React logs errors thrown/rejected inside effects to console.error even when the
    // hook handles them correctly (see loadFailed tests below) — silence the noise.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    useBaulesStore.getState().reset();
    usePhotosStore.getState().reset();
    useRecuerdosStore.getState().reset();
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    vi.mocked(api.chapters.getScope).mockReset().mockResolvedValue({ photos: [], recuerdos: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when baulId or chapterId is missing', () => {
    const { result } = renderHook(() => useChapterScope(undefined, chapterId));

    expect(result.current.isLoading).toBe(false);
    expect(api.chapters.getScope).not.toHaveBeenCalled();
  });

  it('loads photos and recuerdos together when neither is cached, and stays loading until both arrive', async () => {
    // Deferred via a microtask (not a synchronous mock body) so isLoading — derived straight
    // from the store, same as useBaulScope/usePersonaScope — can actually be observed as true
    // before this resolves, same as a real network call would behave.
    vi.mocked(api.chapters.getScope).mockImplementation(() => Promise.resolve().then(() => ({
      photos: [photo()], recuerdos: [recuerdo()],
    })));

    const { result } = renderHook(() => useChapterScope(baulId, chapterId));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(api.chapters.getScope).toHaveBeenCalledWith(baulId, chapterId));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.photos).toEqual([photo()]);
    expect(result.current.chapterRecuerdos).toEqual([recuerdo()]);
    expect(result.current.loadFailed).toBe(false);
  });

  it('does not refetch anything once both are already cached', async () => {
    seedChapterPhotos(chapterId, [photo()]);
    useRecuerdosStore.setState((state) => ({ chapterRecuerdos: { ...state.chapterRecuerdos, [chapterId]: [] } }));

    const { result } = renderHook(() => useChapterScope(baulId, chapterId));

    await act(async () => {
      await Promise.resolve();
    });
    expect(api.chapters.getScope).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.photos).toEqual([photo()]);
  });

  it('surfaces loadFailed when the fetch fails, and retry can recover', async () => {
    vi.mocked(api.chapters.getScope).mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useChapterScope(baulId, chapterId));

    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(result.current.isLoading).toBe(false);

    vi.mocked(api.chapters.getScope).mockResolvedValueOnce({ photos: [photo()], recuerdos: [recuerdo()] });

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
    expect(api.chapters.getScope).not.toHaveBeenCalled();
  });

  // Regression: navigating straight from one chapter to another (e.g. BatchPhotoActionsContainer
  // moving photos and then navigating to the target chapter's URL) keeps ChapterRoute — and this
  // hook — mounted; only chapterId changes. If chapter A's fetch is still in flight at that
  // point, its eventual (successful) resolution must not be mistaken for chapter B's.
  it('never reports "ready" for a chapter whose data was never actually fetched, even when a stale fetch for the previous chapter resolves afterwards', async () => {
    const chapterA = 'chapter-a';
    const chapterB = 'chapter-b';
    let resolveA: () => void = () => {};

    vi.mocked(api.chapters.getScope).mockImplementation((_baulId: string, id: string) => {
      if (id === chapterA) {
        return new Promise((resolve) => {
          resolveA = () => resolve({ photos: [photo()], recuerdos: [] });
        });
      }
      return Promise.resolve({ photos: [photo()], recuerdos: [] });
    });

    const { result, rerender } = renderHook(
      ({ chapterId }: { chapterId: string }) => useChapterScope(baulId, chapterId),
      { initialProps: { chapterId: chapterA } }
    );

    expect(result.current.isLoading).toBe(true);

    // Navigate to chapter B before chapter A's own fetch has resolved.
    rerender({ chapterId: chapterB });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Chapter A's stale fetch finally resolves successfully — must not be mistaken for chapter
    // B's own data (it's keyed by chapterId in the store, so this passes if the store writes are
    // correctly keyed either way; the real regression coverage is `isLoading` above having
    // already resolved for chapter B without needing chapter A's stale promise at all).
    await act(async () => {
      resolveA();
      await Promise.resolve();
    });

    expect(result.current.loadFailed || (!!result.current.photos && !!result.current.chapterRecuerdos)).toBe(true);
  });

  it('ignores a failed fetch for the previous chapter after navigating to a loaded one', async () => {
    const chapterA = 'chapter-a';
    const chapterB = 'chapter-b';
    let rejectA: (error: Error) => void = () => {};

    vi.mocked(api.chapters.getScope).mockImplementation((_baulId: string, id: string) => {
      if (id === chapterA) {
        return new Promise((_resolve, reject) => {
          rejectA = reject;
        });
      }
      return Promise.resolve({ photos: [photo({ id: `photo-${id}` })], recuerdos: [recuerdo({ id: `recuerdo-${id}` })] });
    });

    const { result, rerender } = renderHook(
      ({ chapterId }: { chapterId: string }) => useChapterScope(baulId, chapterId),
      { initialProps: { chapterId: chapterA } }
    );

    rerender({ chapterId: chapterB });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      rejectA(new Error('old chapter failed'));
      await Promise.resolve();
    });

    expect(result.current.photos).toEqual([photo({ id: `photo-${chapterB}` })]);
    expect(result.current.chapterRecuerdos).toEqual([recuerdo({ id: `recuerdo-${chapterB}` })]);
    expect(result.current.loadFailed).toBe(false);
  });
});
