import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul, Chapter, Photo, RemovalRequest } from '@/types';

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('@/api', () => ({
  api: {
    baules: {
      setCover: vi.fn(),
      getRemovalRequests: vi.fn(),
    },
    chapters: {
      create: vi.fn(),
      getAll: vi.fn(),
      setCover: vi.fn(),
    },
    photos: {
      upload: vi.fn(),
      getAll: vi.fn(),
      move: vi.fn(),
    },
  },
}));

import * as Sentry from '@sentry/react';
import { api } from '@/api';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePersonasStore } from '@/store/usePersonasStore';
import { uploadPhotos, uploadPhotosWithChapter, movePhotos, loadRemovalRequests } from './index';
import { UploadItem } from '@/features/photos/uploadFlow';
import { createChapter } from '@/features/chapters/useCases';

// Regression coverage for the upload path (uploadPhotos / uploadPhotosWithChapter): a
// per-file loop whose behavior — reading each file before upload, tagging Sentry per failure
// phase, never letting one file's failure abort the rest, and reconciling store state from the
// server afterwards — used to be duplicated almost verbatim between a chapter-only uploadPhotos
// and a loose-photos-only uploadLoosePhotos. uploadPhotos now takes a nullable chapterId
// (mirroring movePhotos/deletePhoto/changePhotoDate) and branches only in the post-upload state
// reconciliation; this suite pins both branches' behavior down.
describe('photos useCases uploads', () => {
  const baulId = 'baul-1';
  const chapterId = 'chapter-1';

  function fakeFile(name: string, { readable = true }: { readable?: boolean } = {}): File {
    return {
      name,
      size: 100,
      type: 'image/jpeg',
      slice: () => ({
        arrayBuffer: () =>
          readable ? Promise.resolve(new ArrayBuffer(0)) : Promise.reject(new Error('cannot read')),
      }),
    } as unknown as File;
  }

  function newBaul(overrides: Partial<ConstructorParameters<typeof Baul>[0]> = {}): Baul {
    const now = new Date().toISOString();
    return new Baul({
      id: baulId,
      name: 'Baúl',
      chapterCount: 1,
      createdAt: now,
      updatedAt: now,
      isCustodio: true,
      role: 'custodio',
      memberCount: 1,
      ...overrides,
    });
  }

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

  function newPhoto(id: string, overrides: Partial<ConstructorParameters<typeof Photo>[0]> = {}): Photo {
    return new Photo({
      id,
      baulId,
      thumbnailUrl: `${id}-thumb`,
      fullUrl: `${id}-full`,
      uploadedBy: 'user-1',
      createdAt: new Date().toISOString(),
      recuerdoCount: 0,
      ...overrides,
    });
  }

  beforeEach(() => {
    useBaulesStore.setState({ baules: [], chapters: {}, photos: {}, loosePhotos: {}, isLoading: false });
    vi.clearAllMocks();
  });

  describe('uploadPhotos (chapter)', () => {
    it('uploads every file, refetches the chapter, and fills in cover photos left unset', async () => {
      useBaulesStore.setState({
        baules: [newBaul()],
        chapters: { [baulId]: [newChapter({ photoCount: 0 })] },
      });

      const photo1 = newPhoto('photo-1');
      const photo2 = newPhoto('photo-2');
      const items: UploadItem[] = [
        { clientUploadId: 'c1', file: fakeFile('a.jpg') },
        { clientUploadId: 'c2', file: fakeFile('b.jpg') },
      ];

      vi.mocked(api.photos.upload)
        .mockResolvedValueOnce(photo1)
        .mockResolvedValueOnce(photo2);
      vi.mocked(api.photos.getAll).mockResolvedValue([photo1, photo2]);
      vi.mocked(api.chapters.getAll).mockResolvedValue([
        newChapter({ photoCount: 2, coverPhotoUrl: photo1.thumbnailUrl }),
      ]);

      const onItemSettled = vi.fn();
      const results = await uploadPhotos(baulId, chapterId, items, onItemSettled);

      expect(results).toEqual([
        { clientUploadId: 'c1', photo: photo1 },
        { clientUploadId: 'c2', photo: photo2 },
      ]);
      expect(onItemSettled).toHaveBeenCalledTimes(2);
      expect(api.photos.getAll).toHaveBeenCalledWith(chapterId);
      expect(api.chapters.getAll).toHaveBeenCalledWith(baulId);

      const state = useBaulesStore.getState();
      expect(state.photos[chapterId]).toEqual([photo1, photo2]);
      expect(state.chapters[baulId][0].photoCount).toBe(2);
      expect(state.chapters[baulId][0].coverPhotoUrl).toBe(photo1.thumbnailUrl);
      expect(state.baules[0].coverPhotoUrl).toBe(photo1.thumbnailUrl);
    });

    it('keeps a per-file failure from aborting the rest, and still reconciles from the server', async () => {
      useBaulesStore.setState({
        baules: [newBaul()],
        chapters: { [baulId]: [newChapter({ photoCount: 0 })] },
      });

      const photo1 = newPhoto('photo-1');
      const items: UploadItem[] = [
        { clientUploadId: 'ok', file: fakeFile('a.jpg') },
        { clientUploadId: 'fails', file: fakeFile('b.jpg') },
      ];

      vi.mocked(api.photos.upload)
        .mockResolvedValueOnce(photo1)
        .mockRejectedValueOnce(new Error('network down'));
      vi.mocked(api.photos.getAll).mockResolvedValue([photo1]);
      vi.mocked(api.chapters.getAll).mockResolvedValue([
        newChapter({ photoCount: 1, coverPhotoUrl: photo1.thumbnailUrl }),
      ]);

      const results = await uploadPhotos(baulId, chapterId, items);

      expect(results).toEqual([
        { clientUploadId: 'ok', photo: photo1 },
        { clientUploadId: 'fails', error: 'network down' },
      ]);
      expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), { tags: { phase: 'upload-request' } });
      expect(useBaulesStore.getState().photos[chapterId]).toEqual([photo1]);
    });

    it('tags unreadable files separately, never calls the upload API for them, and still uploads the rest', async () => {
      useBaulesStore.setState({
        baules: [newBaul()],
        chapters: { [baulId]: [newChapter({ photoCount: 0 })] },
      });

      const photo1 = newPhoto('photo-1');
      const items: UploadItem[] = [
        { clientUploadId: 'unreadable', file: fakeFile('a.jpg', { readable: false }) },
        { clientUploadId: 'ok', file: fakeFile('b.jpg') },
      ];

      vi.mocked(api.photos.upload).mockResolvedValueOnce(photo1);
      vi.mocked(api.photos.getAll).mockResolvedValue([photo1]);
      vi.mocked(api.chapters.getAll).mockResolvedValue([
        newChapter({ photoCount: 1, coverPhotoUrl: photo1.thumbnailUrl }),
      ]);

      const results = await uploadPhotos(baulId, chapterId, items);

      expect(results).toEqual([
        { clientUploadId: 'unreadable', error: 'No se pudo leer la foto (puede que ya no esté disponible)' },
        { clientUploadId: 'ok', photo: photo1 },
      ]);
      expect(api.photos.upload).toHaveBeenCalledTimes(1);
      expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
        tags: { phase: 'read-file-before-upload' },
        extra: { name: 'a.jpg', size: 100, type: 'image/jpeg' },
      });
    });

    it('does not refetch or touch the chapter when every file fails', async () => {
      useBaulesStore.setState({
        baules: [newBaul()],
        chapters: { [baulId]: [newChapter({ photoCount: 0 })] },
      });

      vi.mocked(api.photos.upload).mockRejectedValue(new Error('boom'));

      await uploadPhotos(baulId, chapterId, [{ clientUploadId: 'c1', file: fakeFile('a.jpg') }]);

      expect(api.photos.getAll).not.toHaveBeenCalled();
      expect(useBaulesStore.getState().photos[chapterId]).toBeUndefined();
    });
  });

  describe('uploadPhotos (loose, chapterId null)', () => {
    it('appends uploaded photos to loosePhotos and fills in the baúl cover, without touching chapters', async () => {
      useBaulesStore.setState({
        baules: [newBaul()],
        loosePhotos: { [baulId]: [newPhoto('existing')] },
      });

      const photo1 = newPhoto('photo-1');
      vi.mocked(api.photos.upload).mockResolvedValueOnce(photo1);

      const results = await uploadPhotos(baulId, null, [{ clientUploadId: 'c1', file: fakeFile('a.jpg') }]);

      expect(results).toEqual([{ clientUploadId: 'c1', photo: photo1 }]);
      expect(api.photos.upload).toHaveBeenCalledWith(baulId, null, expect.anything(), 'c1', undefined);
      const state = useBaulesStore.getState();
      expect(state.loosePhotos[baulId]).toEqual([newPhoto('existing'), photo1]);
      expect(state.baules[0].coverPhotoUrl).toBe(photo1.thumbnailUrl);
      expect(state.chapters[baulId]).toBeUndefined();
      expect(api.photos.getAll).not.toHaveBeenCalled();
    });

    it('keeps a per-file failure from aborting the rest', async () => {
      useBaulesStore.setState({ baules: [newBaul()], loosePhotos: {} });

      const photo1 = newPhoto('photo-1');
      vi.mocked(api.photos.upload)
        .mockResolvedValueOnce(photo1)
        .mockRejectedValueOnce(new Error('network down'));

      const results = await uploadPhotos(baulId, null, [
        { clientUploadId: 'ok', file: fakeFile('a.jpg') },
        { clientUploadId: 'fails', file: fakeFile('b.jpg') },
      ]);

      expect(results).toEqual([
        { clientUploadId: 'ok', photo: photo1 },
        { clientUploadId: 'fails', error: 'network down' },
      ]);
      expect(useBaulesStore.getState().loosePhotos[baulId]).toEqual([photo1]);
    });
  });

  describe('uploadPhotosWithChapter', () => {
    const items: UploadItem[] = [{ clientUploadId: 'c1', file: fakeFile('a.jpg') }];

    it('delegates to uploadPhotos when targeting an existing chapter', async () => {
      useBaulesStore.setState({
        baules: [newBaul()],
        chapters: { [baulId]: [newChapter({ photoCount: 0 })] },
      });
      const photo1 = newPhoto('photo-1');
      vi.mocked(api.photos.upload).mockResolvedValueOnce(photo1);
      vi.mocked(api.photos.getAll).mockResolvedValue([photo1]);

      const { results, chapterId: resolvedChapterId } = await uploadPhotosWithChapter(
        baulId, { type: 'existing', chapterId }, items
      );

      expect(resolvedChapterId).toBe(chapterId);
      expect(results).toEqual([{ clientUploadId: 'c1', photo: photo1 }]);
      expect(api.photos.upload).toHaveBeenCalledWith(baulId, chapterId, expect.anything(), 'c1', undefined);
    });

    it('delegates to uploadPhotos with a null chapterId when there is no target chapter', async () => {
      useBaulesStore.setState({ baules: [newBaul()], loosePhotos: {} });
      const photo1 = newPhoto('photo-1');
      vi.mocked(api.photos.upload).mockResolvedValueOnce(photo1);

      const { results, chapterId: resolvedChapterId } = await uploadPhotosWithChapter(
        baulId, { type: 'none' }, items
      );

      expect(resolvedChapterId).toBeNull();
      expect(results).toEqual([{ clientUploadId: 'c1', photo: photo1 }]);
      expect(api.photos.upload).toHaveBeenCalledWith(baulId, null, expect.anything(), 'c1', undefined);
    });
  });
});

// Regression coverage for movePhotos's partial-failure handling: each photo is moved with
// its own try/catch (mirroring uploadPhotos) specifically because an earlier version threw
// on the first failure without reconciling anything that had already succeeded server-side —
// see the comment above movePhotos in features/photos/useCases/index.ts. This pins down that
// succeeded moves are still reflected in both the source and target caches even when some
// photos fail, and that failing *every* photo skips reconciliation entirely rather than
// fabricating state from an unmade request.
describe('photos useCases movePhotos', () => {
  const baulId = 'baul-1';
  const sourceChapterId = 'chapter-src';
  const targetChapterId = 'chapter-target';

  function newChapter(id: string, overrides: Partial<ConstructorParameters<typeof Chapter>[0]> = {}): Chapter {
    const now = new Date().toISOString();
    return new Chapter({
      id,
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

  function newPhoto(id: string, overrides: Partial<ConstructorParameters<typeof Photo>[0]> = {}): Photo {
    return new Photo({
      id,
      baulId,
      thumbnailUrl: `${id}-thumb`,
      fullUrl: `${id}-full`,
      uploadedBy: 'user-1',
      createdAt: new Date().toISOString(),
      recuerdoCount: 0,
      ...overrides,
    });
  }

  beforeEach(() => {
    useBaulesStore.setState({ baules: [], chapters: {}, photos: {}, loosePhotos: {}, isLoading: false });
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
      photos: { [sourceChapterId]: [photoA, photoB] },
    });

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
    expect(state.photos[sourceChapterId]).toEqual([photoB]);
    expect(state.photos[targetChapterId]).toEqual([photoA]);

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
      photos: { [sourceChapterId]: [photoA, photoB] },
    });

    vi.mocked(api.photos.move).mockRejectedValue(new Error('boom'));

    await expect(
      movePhotos(baulId, sourceChapterId, [photoA.id, photoB.id], targetChapterId)
    ).rejects.toThrow('No se pudo mover ninguna de las 2 fotos');

    expect(api.photos.getAll).not.toHaveBeenCalled();
    expect(useBaulesStore.getState().photos[sourceChapterId]).toEqual([photoA, photoB]);
  });

  it('reconciles loosePhotos instead of a chapter cache when moving out of fotos sueltas', async () => {
    const photoA = newPhoto('photo-a');
    const photoB = newPhoto('photo-b');
    useBaulesStore.setState({
      chapters: { [baulId]: [newChapter(targetChapterId, { photoCount: 0 })] },
      loosePhotos: { [baulId]: [photoA, photoB] },
    });

    vi.mocked(api.photos.move).mockResolvedValue(photoA);
    vi.mocked(api.photos.getAll).mockResolvedValue([photoA]);
    vi.mocked(api.chapters.getAll).mockResolvedValue([
      newChapter(targetChapterId, { photoCount: 1, coverPhotoUrl: photoA.thumbnailUrl }),
    ]);

    await movePhotos(baulId, null, [photoA.id], targetChapterId);

    const state = useBaulesStore.getState();
    expect(state.loosePhotos[baulId]).toEqual([photoB]);
    expect(state.photos[targetChapterId]).toEqual([photoA]);
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
          isCustodio: true,
          role: 'custodio',
          memberCount: 1,
        }),
      ],
      chapters: { [baulId]: [] },
      loosePhotos: { [baulId]: [photoA] },
    });

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

// Regression coverage for a bug where loadRemovalRequests swallowed every error — a genuine
// network failure looked identical to "this baúl has no pending requests" and never reached
// the caller's toast/Sentry reporting.
describe('photos useCases loadRemovalRequests', () => {
  const baulId = 'baul-1';

  beforeEach(() => {
    usePersonasStore.setState({ personas: {}, removalRequests: {}, personaPhotos: {}, taggedPersonas: {} });
    vi.clearAllMocks();
  });

  it('rejects and leaves the store untouched when the API call fails', async () => {
    const error = new Error('network down');
    vi.mocked(api.baules.getRemovalRequests).mockRejectedValue(error);

    await expect(loadRemovalRequests(baulId)).rejects.toThrow(error);

    expect(usePersonasStore.getState().removalRequests[baulId]).toBeUndefined();
  });

  it('still stores the result on success', async () => {
    const request = new RemovalRequest({
      id: 'r1',
      baulId,
      photoId: 'photo-1',
      photoUrl: 'url',
      requesterName: 'Pedro',
      requesterEmail: 'pedro@example.com',
      reason: 'blurry',
      requestDate: new Date().toISOString(),
      status: 'pending',
    });
    vi.mocked(api.baules.getRemovalRequests).mockResolvedValue([request]);

    await loadRemovalRequests(baulId);

    expect(usePersonasStore.getState().removalRequests[baulId]).toEqual([request]);
  });
});
