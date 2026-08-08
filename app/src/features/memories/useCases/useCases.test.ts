import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedItem, PhotoBatch, Recuerdo } from '@/types';

vi.mock('@/api', () => ({
  api: {
    recuerdos: {
      create: vi.fn(),
      createForChapter: vi.fn(),
      update: vi.fn(),
    },
    baules: {
      getFeed: vi.fn(),
    },
  },
}));

import { api } from '@/api';
import { useRecuerdosStore } from '@/store/useRecuerdosStore';
import { addRecuerdo, addChapterRecuerdo, editRecuerdo, loadBaulFeed } from './index';

// Regression coverage for a bug where adding a recuerdo from a photo or a chapter never
// showed up in the baúl-wide "Recuerdos" tab until the baúl page was reloaded: addRecuerdo
// and addChapterRecuerdo only ever patched their own narrow cache (recuerdos[photoId] /
// chapterRecuerdos[chapterId]), never baulRecuerdos[baulId] — the tab's own load is skipped
// once that cache has *any* value, so it never noticed the addition happened elsewhere.
describe('memories useCases recuerdo caches stay in sync', () => {
  const baulId = 'baul-1';
  const photoId = 'photo-1';
  const chapterId = 'chapter-1';

  beforeEach(() => {
    useRecuerdosStore.setState({ recuerdos: {}, chapterRecuerdos: {}, baulRecuerdos: {}, baulFeed: {} });
    vi.clearAllMocks();
  });

  function newRecuerdo(id: string, overrides: Partial<ConstructorParameters<typeof Recuerdo>[0]> = {}): Recuerdo {
    return new Recuerdo({
      id,
      userId: 'user-1',
      text: 'hola',
      userName: 'Pedro',
      createdAt: new Date().toISOString(),
      isOwn: false,
      ...overrides,
    });
  }

  it('addRecuerdo patches baulRecuerdos when the baúl-level tab was already loaded', async () => {
    const existing = newRecuerdo('existing');
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [existing] } });

    const created = newRecuerdo('new', { photoId });
    vi.mocked(api.recuerdos.create).mockResolvedValue(created);

    await addRecuerdo(baulId, photoId, 'hola');

    expect(useRecuerdosStore.getState().recuerdos[photoId]).toEqual([created]);
    expect(useRecuerdosStore.getState().baulRecuerdos[baulId]).toEqual([created, existing]);
  });

  it('addRecuerdo does not fabricate a partial baulRecuerdos entry when the tab was never loaded', async () => {
    const created = newRecuerdo('new', { photoId });
    vi.mocked(api.recuerdos.create).mockResolvedValue(created);

    await addRecuerdo(baulId, photoId, 'hola');

    expect(useRecuerdosStore.getState().recuerdos[photoId]).toEqual([created]);
    expect(useRecuerdosStore.getState().baulRecuerdos[baulId]).toBeUndefined();
  });

  it('addChapterRecuerdo patches baulRecuerdos when the baúl-level tab was already loaded', async () => {
    const existing = newRecuerdo('existing');
    useRecuerdosStore.setState({ baulRecuerdos: { [baulId]: [existing] } });

    const created = newRecuerdo('new', { chapterId });
    vi.mocked(api.recuerdos.createForChapter).mockResolvedValue(created);

    await addChapterRecuerdo(baulId, chapterId, 'hola');

    expect(useRecuerdosStore.getState().chapterRecuerdos[chapterId]).toEqual([created]);
    expect(useRecuerdosStore.getState().baulRecuerdos[baulId]).toEqual([created, existing]);
  });

  it('addChapterRecuerdo does not fabricate a partial baulRecuerdos entry when the tab was never loaded', async () => {
    const created = newRecuerdo('new', { chapterId });
    vi.mocked(api.recuerdos.createForChapter).mockResolvedValue(created);

    await addChapterRecuerdo(baulId, chapterId, 'hola');

    expect(useRecuerdosStore.getState().chapterRecuerdos[chapterId]).toEqual([created]);
    expect(useRecuerdosStore.getState().baulRecuerdos[baulId]).toBeUndefined();
  });

  it('editRecuerdo patches every loaded cache containing that recuerdo', async () => {
    const original = newRecuerdo('r1', { text: 'texto original', photoId, chapterId });
    const other = newRecuerdo('r2', { text: 'otro' });
    useRecuerdosStore.setState({
      recuerdos: { [photoId]: [original, other] },
      chapterRecuerdos: { [chapterId]: [original] },
      baulRecuerdos: { [baulId]: [original, other] },
    });

    const updated = newRecuerdo('r1', { text: 'texto editado', photoId, chapterId });
    vi.mocked(api.recuerdos.update).mockResolvedValue(updated);

    await editRecuerdo('r1', 'texto editado');

    expect(api.recuerdos.update).toHaveBeenCalledWith('r1', 'texto editado');
    expect(useRecuerdosStore.getState().recuerdos[photoId]).toEqual([updated, other]);
    expect(useRecuerdosStore.getState().chapterRecuerdos[chapterId]).toEqual([updated]);
    expect(useRecuerdosStore.getState().baulRecuerdos[baulId]).toEqual([updated, other]);
  });

  // Same staleness bug as above, for the toggle-on feed cache: adding/editing a recuerdo
  // must keep baulFeed in sync too, or the feed tab would show stale content until reload.
  it('addRecuerdo prepends a feed item to baulFeed when the feed tab was already loaded', async () => {
    const batch = new PhotoBatch({
      batchId: 'batch-1', userId: 'user-1', userName: 'Ana', photoCount: 1,
      createdAt: new Date(0).toISOString(), previewPhotos: [],
    });
    const existingBatch: FeedItem = { type: 'photo_batch', createdAt: batch.createdAt, photoBatch: batch };
    useRecuerdosStore.setState({ baulFeed: { [baulId]: [existingBatch] } });

    const created = newRecuerdo('new', { photoId });
    vi.mocked(api.recuerdos.create).mockResolvedValue(created);

    await addRecuerdo(baulId, photoId, 'hola');

    const feed = useRecuerdosStore.getState().baulFeed[baulId];
    expect(feed).toHaveLength(2);
    expect(feed[0]).toEqual({ type: 'recuerdo', createdAt: created.createdAt, recuerdo: created });
    expect(feed[1]).toBe(existingBatch);
  });

  it('addRecuerdo does not fabricate a partial baulFeed entry when the feed tab was never loaded', async () => {
    const created = newRecuerdo('new', { photoId });
    vi.mocked(api.recuerdos.create).mockResolvedValue(created);

    await addRecuerdo(baulId, photoId, 'hola');

    expect(useRecuerdosStore.getState().baulFeed[baulId]).toBeUndefined();
  });

  it('editRecuerdo patches the recuerdo item inside a cached baulFeed too', async () => {
    const original = newRecuerdo('r1', { text: 'texto original' });
    const feedItem: FeedItem = { type: 'recuerdo', createdAt: original.createdAt, recuerdo: original };
    useRecuerdosStore.setState({ baulFeed: { [baulId]: [feedItem] } });

    const updated = newRecuerdo('r1', { text: 'texto editado' });
    vi.mocked(api.recuerdos.update).mockResolvedValue(updated);

    await editRecuerdo('r1', 'texto editado');

    const feed = useRecuerdosStore.getState().baulFeed[baulId];
    expect(feed[0].type).toBe('recuerdo');
    expect(feed[0].type === 'recuerdo' && feed[0].recuerdo).toEqual(updated);
  });
});

describe('memories useCases loadBaulFeed', () => {
  const baulId = 'baul-1';

  beforeEach(() => {
    useRecuerdosStore.setState({ baulFeed: {} });
    vi.clearAllMocks();
  });

  it('fetches and caches the merged feed under its baulId', async () => {
    const recuerdo = new Recuerdo({
      id: 'r1', userId: 'user-1', text: 'hola', userName: 'Pedro', createdAt: new Date().toISOString(), isOwn: false,
    });
    const feed: FeedItem[] = [{ type: 'recuerdo', createdAt: recuerdo.createdAt, recuerdo }];
    vi.mocked(api.baules.getFeed).mockResolvedValue(feed);

    await loadBaulFeed(baulId);

    expect(api.baules.getFeed).toHaveBeenCalledWith(baulId);
    expect(useRecuerdosStore.getState().baulFeed[baulId]).toEqual(feed);
  });
});
