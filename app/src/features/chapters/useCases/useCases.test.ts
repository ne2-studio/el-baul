import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Chapter } from '@/types';

vi.mock('@/api', () => ({
  api: {
    chapters: {
      setCover: vi.fn(),
    },
  },
}));

import { api } from '@/api';
import { useBaulesStore } from '@/store/useBaulesStore';
import { setChapterCover } from './index';

// Regression coverage for the optimistic-update/rollback pairing in setChapterCover: applies
// the caller-provided thumbnail immediately for instant feedback, then either confirms it with
// the server's response or rolls back to the pre-update snapshot if the request fails. A
// rollback that missed a field, or that failed to rethrow, would leave the UI either silently
// wrong or unaware the change didn't actually happen.
describe('chapters useCases setChapterCover', () => {
  const baulId = 'baul-1';
  const chapterId = 'chapter-1';
  const photoId = 'photo-1';

  function newChapter(overrides: Partial<ConstructorParameters<typeof Chapter>[0]> = {}): Chapter {
    const now = new Date().toISOString();
    return new Chapter({
      id: chapterId,
      baulId,
      name: 'Capítulo',
      photoCount: 0,
      createdAt: now,
      updatedAt: now,
      recuerdoCount: 0,
      undatedPhotoCount: 0,
      ...overrides,
    });
  }

  beforeEach(() => {
    useBaulesStore.setState({ baules: [], chapters: {}, photos: {}, loosePhotos: {}, isLoading: false });
    vi.clearAllMocks();
  });

  it('applies the optimistic thumbnail immediately, then replaces it with the server response', async () => {
    useBaulesStore.setState({ chapters: { [baulId]: [newChapter({ coverPhotoUrl: 'old-thumb' })] } });

    let resolveSetCover!: (chapter: Chapter) => void;
    vi.mocked(api.chapters.setCover).mockReturnValue(new Promise((resolve) => { resolveSetCover = resolve; }));

    const promise = setChapterCover(baulId, chapterId, photoId, { x: 0.5, y: 0.5, scale: 1 }, 'optimistic-thumb');
    expect(useBaulesStore.getState().chapters[baulId][0].coverPhotoUrl).toBe('optimistic-thumb');

    const serverChapter = newChapter({ coverPhotoUrl: 'server-thumb' });
    resolveSetCover(serverChapter);
    await promise;

    expect(useBaulesStore.getState().chapters[baulId][0].coverPhotoUrl).toBe('server-thumb');
  });

  it('rolls back to the previous chapters snapshot and rethrows when the request fails', async () => {
    const original = newChapter({ coverPhotoUrl: 'old-thumb' });
    useBaulesStore.setState({ chapters: { [baulId]: [original] } });

    vi.mocked(api.chapters.setCover).mockRejectedValue(new Error('server rejected cover'));

    await expect(
      setChapterCover(baulId, chapterId, photoId, { x: 0.5, y: 0.5, scale: 1 }, 'optimistic-thumb')
    ).rejects.toThrow('server rejected cover');

    expect(useBaulesStore.getState().chapters[baulId][0]).toBe(original);
  });
});
