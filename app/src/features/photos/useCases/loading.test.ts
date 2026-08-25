import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api', () => ({
  api: {
    baules: {
      getLoosePhotos: vi.fn(),
      getRemovalRequests: vi.fn(),
      submitRemovalRequest: vi.fn(),
      approveRemovalRequest: vi.fn(),
      rejectRemovalRequest: vi.fn(),
    },
    chapters: {
      getAll: vi.fn(),
    },
    photos: {
      upload: vi.fn(),
      getAll: vi.fn(),
      getPage: vi.fn(),
      move: vi.fn(),
      delete: vi.fn(),
      changeDate: vi.fn(),
      clearDate: vi.fn(),
      getTaggedPersonas: vi.fn(),
      setTaggedPersonas: vi.fn(),
      confirmNoPersonas: vi.fn(),
    },
    photoBatches: {
      getPhotos: vi.fn(),
    },
  },
}));

import { api } from '@/api';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { loadBaulPhotos, loadMoreBaulPhotos, loadPhotoBatchPhotos } from './index';
import { newPhoto } from './testFactories';

describe('photos useCases loadPhotoBatchPhotos', () => {
  const baulId = 'baul-1';
  const batchId = 'batch-1';

  beforeEach(() => {
    useBaulesStore.setState({ photoBatchPhotos: {} });
    usePhotosStore.setState({ photosById: {} });
    vi.clearAllMocks();
  });

  it('fetches and caches a batch photo ids under its batchId, without touching other batches', async () => {
    const photo = newPhoto('photo-1');
    const otherPhoto = newPhoto('other-photo', { thumbnailUrl: 'thumb2', fullUrl: 'full2' });
    useBaulesStore.setState({ photoBatchPhotos: { 'other-batch': [otherPhoto.id] } });
    usePhotosStore.getState().upsertPhotos([otherPhoto]);
    vi.mocked(api.photoBatches.getPhotos).mockResolvedValue([photo]);

    await loadPhotoBatchPhotos(baulId, batchId);

    expect(api.photoBatches.getPhotos).toHaveBeenCalledWith(baulId, batchId);
    expect(useBaulesStore.getState().photoBatchPhotos).toEqual({
      'other-batch': [otherPhoto.id],
      [batchId]: [photo.id],
    });
    expect(usePhotosStore.getState().photosById[photo.id]).toEqual(photo);
  });
});

describe('photos useCases loadBaulPhotos/loadMoreBaulPhotos', () => {
  const baulId = 'baul-1';

  beforeEach(() => {
    useBaulesStore.setState({ baulPhotos: {}, baulPhotosHasMore: {} });
    usePhotosStore.setState({ photosById: {} });
    vi.clearAllMocks();
  });

  it('fetches the first page (no chapterId) and caches it under its baulId, along with hasMore', async () => {
    const photo = newPhoto('photo-1');
    vi.mocked(api.photos.getPage).mockResolvedValue({ photos: [photo], hasMore: true });

    await loadBaulPhotos(baulId);

    expect(api.photos.getPage).toHaveBeenCalledWith(baulId, { skip: 0, take: 60 });
    expect(useBaulesStore.getState().baulPhotos[baulId]).toEqual([photo.id]);
    expect(useBaulesStore.getState().baulPhotosHasMore[baulId]).toBe(true);
    expect(usePhotosStore.getState().photosById[photo.id]).toEqual(photo);
  });

  it('replaces the previous cache on a fresh loadBaulPhotos call, rather than accumulating', async () => {
    const staleFirstPage = newPhoto('stale');
    useBaulesStore.setState({ baulPhotos: { [baulId]: [staleFirstPage.id] } });
    const freshPhoto = newPhoto('fresh');
    vi.mocked(api.photos.getPage).mockResolvedValue({ photos: [freshPhoto], hasMore: false });

    await loadBaulPhotos(baulId);

    expect(useBaulesStore.getState().baulPhotos[baulId]).toEqual([freshPhoto.id]);
  });

  it('loadMoreBaulPhotos appends the next page after whatever is already cached, deriving skip from its length', async () => {
    const firstPagePhoto = newPhoto('photo-1');
    useBaulesStore.setState({ baulPhotos: { [baulId]: [firstPagePhoto.id] } });
    const nextPagePhoto = newPhoto('photo-2');
    vi.mocked(api.photos.getPage).mockResolvedValue({ photos: [nextPagePhoto], hasMore: false });

    await loadMoreBaulPhotos(baulId);

    expect(api.photos.getPage).toHaveBeenCalledWith(baulId, { skip: 1, take: 60 });
    expect(useBaulesStore.getState().baulPhotos[baulId]).toEqual([firstPagePhoto.id, nextPagePhoto.id]);
    expect(useBaulesStore.getState().baulPhotosHasMore[baulId]).toBe(false);
  });
});
