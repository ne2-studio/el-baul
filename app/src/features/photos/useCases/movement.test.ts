import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul } from '@/types';

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
      create: vi.fn(),
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
import { createChapter } from '@/features/chapters/useCases';
import { movePhotos } from './index';
import { newChapter, newPhoto } from './testFactories';

// Regression coverage for movePhotos partial-failure reconciliation.
describe('photos useCases movePhotos', () => {
  const baulId = 'baul-1';
  const sourceChapterId = 'chapter-src';
  const targetChapterId = 'chapter-target';

  beforeEach(() => {
    useBaulesStore.setState({ baules: [], chapters: {}, photos: {}, loosePhotos: {}, isLoading: false });
    usePhotosStore.setState({ photosById: {} });
    vi.clearAllMocks();
  });

  it('reconciles source and target caches for the photos that succeeded, and throws naming the failure count', async () => {
    const photoA = newPhoto('photo-a');
    const photoB = newPhoto('photo-b');
    useBaulesStore.setState({
      chapters: {
        [baulId]: [
          newChapter(sourceChapterId, { photoCount: 2 }),
          newChapter(targetChapterId, { photoCount: 0 }),
        ],
      },
      photos: { [sourceChapterId]: [photoA.id, photoB.id] },
    });
    usePhotosStore.getState().upsertPhotos([photoA, photoB]);

    vi.mocked(api.photos.move)
      .mockResolvedValueOnce(photoA)
      .mockRejectedValueOnce(new Error('no se pudo mover'));
    vi.mocked(api.photos.getAll).mockResolvedValue([photoA]);
    vi.mocked(api.chapters.getAll).mockResolvedValue([
      newChapter(sourceChapterId, { photoCount: 1 }),
      newChapter(targetChapterId, { photoCount: 1, coverPhotoUrl: photoA.thumbnailUrl }),
    ]);

    const onItemSettled = vi.fn();
    await expect(
      movePhotos(baulId, sourceChapterId, [photoA.id, photoB.id], targetChapterId, onItemSettled)
    ).rejects.toThrow('1 de 2 fotos no se pudieron mover');

    expect(onItemSettled).toHaveBeenCalledWith({ photoId: photoA.id });
    expect(onItemSettled).toHaveBeenCalledWith({ photoId: photoB.id, error: 'no se pudo mover' });
    expect(api.photos.getAll).toHaveBeenCalledWith(targetChapterId);

    const state = useBaulesStore.getState();
    expect(state.photos[sourceChapterId]).toEqual([photoB.id]);
    expect(state.photos[targetChapterId]).toEqual([photoA.id]);

    const chapters = state.chapters[baulId];
    expect(chapters.find((c) => c.id === sourceChapterId)?.photoCount).toBe(1);
    const target = chapters.find((c) => c.id === targetChapterId);
    expect(target?.photoCount).toBe(1);
    expect(target?.coverPhotoUrl).toBe(photoA.thumbnailUrl);
  });

  it('throws without reconciling anything when every photo fails to move', async () => {
    const photoA = newPhoto('photo-a');
    const photoB = newPhoto('photo-b');
    useBaulesStore.setState({
      chapters: { [baulId]: [newChapter(sourceChapterId, { photoCount: 2 })] },
      photos: { [sourceChapterId]: [photoA.id, photoB.id] },
    });
    usePhotosStore.getState().upsertPhotos([photoA, photoB]);

    vi.mocked(api.photos.move).mockRejectedValue(new Error('boom'));

    await expect(
      movePhotos(baulId, sourceChapterId, [photoA.id, photoB.id], targetChapterId)
    ).rejects.toThrow('No se pudo mover ninguna de las 2 fotos');

    expect(api.photos.getAll).not.toHaveBeenCalled();
    expect(useBaulesStore.getState().photos[sourceChapterId]).toEqual([photoA.id, photoB.id]);
  });

  it('reconciles loosePhotos instead of a chapter cache when moving out of fotos sueltas', async () => {
    const photoA = newPhoto('photo-a');
    const photoB = newPhoto('photo-b');
    useBaulesStore.setState({
      chapters: { [baulId]: [newChapter(targetChapterId, { photoCount: 0 })] },
      loosePhotos: { [baulId]: [photoA.id, photoB.id] },
    });
    usePhotosStore.getState().upsertPhotos([photoA, photoB]);

    vi.mocked(api.photos.move).mockResolvedValue(photoA);
    vi.mocked(api.photos.getAll).mockResolvedValue([photoA]);
    vi.mocked(api.chapters.getAll).mockResolvedValue([
      newChapter(targetChapterId, { photoCount: 1, coverPhotoUrl: photoA.thumbnailUrl }),
    ]);

    await movePhotos(baulId, null, [photoA.id], targetChapterId);

    const state = useBaulesStore.getState();
    expect(state.loosePhotos[baulId]).toEqual([photoB.id]);
    expect(state.photos[targetChapterId]).toEqual([photoA.id]);
    expect(state.chapters[baulId].find((c) => c.id === targetChapterId)?.photoCount).toBe(1);
  });

  it('refreshes chapter date metadata after creating a chapter from dated loose photos', async () => {
    const date = { year: 1984, month: 7, day: 12 };
    const photoA = newPhoto('photo-a', { dateYear: date.year, dateMonth: date.month, dateDay: date.day });
    const createdChapter = newChapter(targetChapterId, { photoCount: 0 });
    const refreshedChapter = newChapter(targetChapterId, {
      photoCount: 1,
      coverPhotoUrl: photoA.thumbnailUrl,
      minDateYear: date.year,
      minDateMonth: date.month,
      minDateDay: date.day,
      maxDateYear: date.year,
      maxDateMonth: date.month,
      maxDateDay: date.day,
      undatedPhotoCount: 0,
    });
    useBaulesStore.setState({
      baules: [
        new Baul({
          id: baulId,
          name: 'Baúl',
          chapterCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          role: 'administrador',
          isCustodio: true,
          memberCount: 1,
        }),
      ],
      chapters: { [baulId]: [] },
      loosePhotos: { [baulId]: [photoA.id] },
    });
    usePhotosStore.getState().upsertPhotos([photoA]);

    vi.mocked(api.chapters.create).mockResolvedValue(createdChapter);
    vi.mocked(api.photos.move).mockResolvedValue(photoA);
    vi.mocked(api.photos.getAll).mockResolvedValue([photoA]);
    vi.mocked(api.chapters.getAll).mockResolvedValue([refreshedChapter]);

    const created = await createChapter(baulId, 'Verano');
    await movePhotos(baulId, null, [photoA.id], created.id);

    const storedChapter = useBaulesStore.getState().chapters[baulId][0];
    expect(api.chapters.getAll).toHaveBeenCalledWith(baulId);
    expect(storedChapter.minDate).toEqual(date);
    expect(storedChapter.maxDate).toEqual(date);
    expect(storedChapter.photoCount).toBe(1);
  });
});
