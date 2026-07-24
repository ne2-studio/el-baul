import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Baul, Chapter, Photo } from '@/types';

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('@/api', () => ({
  api: {
    chapters: {
      create: vi.fn(),
    },
    photos: {
      upload: vi.fn(),
      getAll: vi.fn(),
    },
  },
}));

import * as Sentry from '@sentry/react';
import { api } from '@/api';
import { useBaulesStore, UploadItem } from './useBaulesStore';

// Regression coverage for the upload path in useBaulesStore (uploadPhotos /
// uploadPhotosWithChapter): a per-file loop whose behavior — reading each file before
// upload, tagging Sentry per failure phase, never letting one file's failure abort the
// rest, and reconciling store state from the server afterwards — used to be duplicated
// almost verbatim between a chapter-only uploadPhotos and a loose-photos-only
// uploadLoosePhotos. uploadPhotos now takes a nullable chapterId (mirroring
// movePhotos/deletePhoto/changePhotoDate) and branches only in the post-upload state
// reconciliation; this suite pins both branches' behavior down.
describe('useBaulesStore uploads', () => {
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
    return new Baul({ id: baulId, name: 'Baúl', chapterCount: 1, updatedAt: new Date().toISOString(), ...overrides });
  }

  function newChapter(overrides: Partial<ConstructorParameters<typeof Chapter>[0]> = {}): Chapter {
    return new Chapter({ id: chapterId, name: 'Capítulo', photoCount: 0, updatedAt: new Date().toISOString(), ...overrides });
  }

  function newPhoto(id: string, overrides: Partial<ConstructorParameters<typeof Photo>[0]> = {}): Photo {
    return new Photo({ id, thumbnailUrl: `${id}-thumb`, fullUrl: `${id}-full`, ...overrides });
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

      const onItemSettled = vi.fn();
      const results = await useBaulesStore.getState().uploadPhotos(baulId, chapterId, items, onItemSettled);

      expect(results).toEqual([
        { clientUploadId: 'c1', photo: photo1 },
        { clientUploadId: 'c2', photo: photo2 },
      ]);
      expect(onItemSettled).toHaveBeenCalledTimes(2);
      expect(api.photos.getAll).toHaveBeenCalledWith(chapterId);

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

      const results = await useBaulesStore.getState().uploadPhotos(baulId, chapterId, items);

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

      const results = await useBaulesStore.getState().uploadPhotos(baulId, chapterId, items);

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

      await useBaulesStore.getState().uploadPhotos(baulId, chapterId, [{ clientUploadId: 'c1', file: fakeFile('a.jpg') }]);

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

      const results = await useBaulesStore
        .getState()
        .uploadPhotos(baulId, null, [{ clientUploadId: 'c1', file: fakeFile('a.jpg') }]);

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

      const results = await useBaulesStore.getState().uploadPhotos(baulId, null, [
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

      const { results, chapterId: resolvedChapterId } = await useBaulesStore
        .getState()
        .uploadPhotosWithChapter(baulId, { type: 'existing', chapterId }, items);

      expect(resolvedChapterId).toBe(chapterId);
      expect(results).toEqual([{ clientUploadId: 'c1', photo: photo1 }]);
      expect(api.photos.upload).toHaveBeenCalledWith(baulId, chapterId, expect.anything(), 'c1', undefined);
    });

    it('delegates to uploadPhotos with a null chapterId when there is no target chapter', async () => {
      useBaulesStore.setState({ baules: [newBaul()], loosePhotos: {} });
      const photo1 = newPhoto('photo-1');
      vi.mocked(api.photos.upload).mockResolvedValueOnce(photo1);

      const { results, chapterId: resolvedChapterId } = await useBaulesStore
        .getState()
        .uploadPhotosWithChapter(baulId, { type: 'none' }, items);

      expect(resolvedChapterId).toBeNull();
      expect(results).toEqual([{ clientUploadId: 'c1', photo: photo1 }]);
      expect(api.photos.upload).toHaveBeenCalledWith(baulId, null, expect.anything(), 'c1', undefined);
    });

    it('creates the chapter first when the user typed a new chapter name, then uploads into it', async () => {
      useBaulesStore.setState({ baules: [newBaul()], chapters: { [baulId]: [] } });
      const newChapterEntity = newChapter({ id: 'new-chapter', photoCount: 0 });
      const photo1 = newPhoto('photo-1');
      vi.mocked(api.chapters.create).mockResolvedValueOnce(newChapterEntity);
      vi.mocked(api.photos.upload).mockResolvedValueOnce(photo1);
      vi.mocked(api.photos.getAll).mockResolvedValue([photo1]);

      const { results, chapterId: resolvedChapterId } = await useBaulesStore
        .getState()
        .uploadPhotosWithChapter(baulId, { type: 'new', name: 'Verano' }, items);

      expect(resolvedChapterId).toBe('new-chapter');
      expect(results).toEqual([{ clientUploadId: 'c1', photo: photo1 }]);
      expect(api.photos.upload).toHaveBeenCalledWith(baulId, 'new-chapter', items[0].file, 'c1', undefined);
    });

    it('reports every item as failed and resolves chapterId to null when chapter creation fails', async () => {
      useBaulesStore.setState({ baules: [newBaul()], chapters: { [baulId]: [] } });
      vi.mocked(api.chapters.create).mockRejectedValueOnce(new Error('No se pudo crear el capítulo'));

      const onItemSettled = vi.fn();
      const { results, chapterId: resolvedChapterId } = await useBaulesStore
        .getState()
        .uploadPhotosWithChapter(baulId, { type: 'new', name: 'Verano' }, items, onItemSettled);

      expect(resolvedChapterId).toBeNull();
      expect(results).toEqual([{ clientUploadId: 'c1', error: 'No se pudo crear el capítulo' }]);
      expect(onItemSettled).toHaveBeenCalledWith(results[0]);
      expect(api.photos.upload).not.toHaveBeenCalled();
    });
  });
});
