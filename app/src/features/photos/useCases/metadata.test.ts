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
import { usePersonasStore } from '@/store/usePersonasStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { changePhotoDate, clearPhotoDate, deletePhoto } from './index';
import { newChapter, newPhoto } from './testFactories';

// Regression coverage for single-write photo cache ownership on delete/date changes.
describe('photos useCases deletePhoto/changePhotoDate', () => {
  const baulId = 'baul-1';
  const photoId = 'photo-1';

  beforeEach(() => {
    useBaulesStore.setState({ chapters: {}, photos: {}, loosePhotos: {}, photoBatchPhotos: {} });
    usePersonasStore.setState({ removalRequests: {}, personaPhotos: {} });
    usePhotosStore.setState({ photosById: {} });
    vi.clearAllMocks();
  });

  it('deletePhoto removes the photo from usePhotosStore and refetches chapters', async () => {
    usePhotosStore.getState().upsertPhotos([newPhoto(photoId)]);
    vi.mocked(api.chapters.getAll).mockResolvedValue([newChapter('chapter-1', { photoCount: 0 })]);

    await deletePhoto(baulId, photoId, 'blurry');

    expect(api.photos.delete).toHaveBeenCalledWith(photoId, 'blurry');
    expect(usePhotosStore.getState().photosById[photoId]).toBeUndefined();
    expect(api.chapters.getAll).toHaveBeenCalledWith(baulId);
    expect(useBaulesStore.getState().chapters[baulId][0].photoCount).toBe(0);
  });

  it('changePhotoDate upserts the updated photo into usePhotosStore and refetches chapters', async () => {
    const updated = newPhoto(photoId, { dateYear: 1990, dateMonth: 6, dateDay: 1 });
    usePhotosStore.getState().upsertPhotos([newPhoto(photoId)]);
    vi.mocked(api.photos.changeDate).mockResolvedValue(updated);
    vi.mocked(api.chapters.getAll).mockResolvedValue([newChapter()]);

    await changePhotoDate(baulId, photoId, { year: 1990, month: 6, day: 1 });

    expect(usePhotosStore.getState().photosById[photoId]).toEqual(updated);
    expect(api.chapters.getAll).toHaveBeenCalledWith(baulId);
  });

  it('clearPhotoDate upserts the updated photo into usePhotosStore and refetches chapters', async () => {
    const updated = newPhoto(photoId);
    usePhotosStore.getState().upsertPhotos([newPhoto(photoId, { dateYear: 1990, dateMonth: 6, dateDay: 1 })]);
    vi.mocked(api.photos.clearDate).mockResolvedValue(updated);
    vi.mocked(api.chapters.getAll).mockResolvedValue([newChapter()]);

    await clearPhotoDate(baulId, photoId);

    expect(api.photos.clearDate).toHaveBeenCalledWith(photoId);
    expect(usePhotosStore.getState().photosById[photoId]).toEqual(updated);
    expect(api.chapters.getAll).toHaveBeenCalledWith(baulId);
  });
});
