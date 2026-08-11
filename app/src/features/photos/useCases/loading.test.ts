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
import { loadPhotoBatchPhotos } from './index';
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
