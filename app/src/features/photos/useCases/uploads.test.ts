import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

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

import * as Sentry from '@sentry/react';
import { api } from '@/api';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { UploadItem } from '@/features/photos/uploadFlow';
import { uploadPhotos, uploadPhotosWithChapter } from './index';
import { fakeFile, newBaul, newChapter, newPhoto } from './testFactories';

// Regression coverage for upload workflow partial failures and post-upload reconciliation.
describe('photos useCases uploads', () => {
  const baulId = 'baul-1';
  const chapterId = 'chapter-1';

  beforeEach(() => {
    useBaulesStore.setState({ baules: [], chapters: {}, photos: {}, loosePhotos: {}, isLoading: false });
    usePhotosStore.setState({ photosById: {} });
    vi.clearAllMocks();
  });

  describe('uploadPhotos (chapter)', () => {
    it('uploads every file, refetches the chapter, and fills in cover photos left unset', async () => {
      useBaulesStore.setState({
        baules: [newBaul()],
        chapters: { [baulId]: [newChapter(chapterId, { photoCount: 0 })] },
      });

      const photo1 = newPhoto('photo-1');
      const photo2 = newPhoto('photo-2');
      const items: UploadItem[] = [
        { clientUploadId: 'c1', uploadBatchId: 'batch-1', file: fakeFile('a.jpg') },
        { clientUploadId: 'c2', uploadBatchId: 'batch-1', file: fakeFile('b.jpg') },
      ];

      vi.mocked(api.photos.upload)
        .mockResolvedValueOnce(photo1)
        .mockResolvedValueOnce(photo2);
      vi.mocked(api.photos.getAll).mockResolvedValue([photo1, photo2]);
      vi.mocked(api.chapters.getAll).mockResolvedValue([
        newChapter(chapterId, { photoCount: 2, coverPhotoUrl: photo1.thumbnailUrl }),
      ]);

      const onItemSettled = vi.fn();
      const results = await uploadPhotos(baulId, chapterId, items, onItemSettled);

      expect(results).toEqual([
        { clientUploadId: 'c1', photo: photo1, alreadyExisted: false },
        { clientUploadId: 'c2', photo: photo2, alreadyExisted: false },
      ]);
      expect(onItemSettled).toHaveBeenCalledTimes(2);
      expect(api.photos.getAll).toHaveBeenCalledWith(chapterId);
      expect(api.chapters.getAll).toHaveBeenCalledWith(baulId);

      const state = useBaulesStore.getState();
      expect(state.photos[chapterId]).toEqual([photo1.id, photo2.id]);
      expect(state.chapters[baulId][0].photoCount).toBe(2);
      expect(state.chapters[baulId][0].coverPhotoUrl).toBe(photo1.thumbnailUrl);
      expect(state.baules[0].coverPhotoUrl).toBe(photo1.thumbnailUrl);
      expect(usePhotosStore.getState().photosById).toEqual({ [photo1.id]: photo1, [photo2.id]: photo2 });
    });

    it('keeps a per-file failure from aborting the rest, and still reconciles from the server', async () => {
      useBaulesStore.setState({
        baules: [newBaul()],
        chapters: { [baulId]: [newChapter(chapterId, { photoCount: 0 })] },
      });

      const photo1 = newPhoto('photo-1');
      const items: UploadItem[] = [
        { clientUploadId: 'ok', uploadBatchId: 'batch-1', file: fakeFile('a.jpg') },
        { clientUploadId: 'fails', uploadBatchId: 'batch-1', file: fakeFile('b.jpg') },
      ];

      vi.mocked(api.photos.upload)
        .mockResolvedValueOnce(photo1)
        .mockRejectedValueOnce(new Error('network down'));
      vi.mocked(api.photos.getAll).mockResolvedValue([photo1]);
      vi.mocked(api.chapters.getAll).mockResolvedValue([
        newChapter(chapterId, { photoCount: 1, coverPhotoUrl: photo1.thumbnailUrl }),
      ]);

      const results = await uploadPhotos(baulId, chapterId, items);

      expect(results).toEqual([
        { clientUploadId: 'ok', photo: photo1, alreadyExisted: false },
        { clientUploadId: 'fails', error: 'network down' },
      ]);
      expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), { tags: { phase: 'upload-request' } });
      expect(useBaulesStore.getState().photos[chapterId]).toEqual([photo1.id]);
    });

    it('tags unreadable files separately, never calls the upload API for them, and still uploads the rest', async () => {
      useBaulesStore.setState({
        baules: [newBaul()],
        chapters: { [baulId]: [newChapter(chapterId, { photoCount: 0 })] },
      });

      const photo1 = newPhoto('photo-1');
      const items: UploadItem[] = [
        { clientUploadId: 'unreadable', uploadBatchId: 'batch-1', file: fakeFile('a.jpg', { readable: false }) },
        { clientUploadId: 'ok', uploadBatchId: 'batch-1', file: fakeFile('b.jpg') },
      ];

      vi.mocked(api.photos.upload).mockResolvedValueOnce(photo1);
      vi.mocked(api.photos.getAll).mockResolvedValue([photo1]);
      vi.mocked(api.chapters.getAll).mockResolvedValue([
        newChapter(chapterId, { photoCount: 1, coverPhotoUrl: photo1.thumbnailUrl }),
      ]);

      const results = await uploadPhotos(baulId, chapterId, items);

      expect(results).toEqual([
        { clientUploadId: 'unreadable', error: 'No se pudo leer la foto (puede que ya no esté disponible)' },
        { clientUploadId: 'ok', photo: photo1, alreadyExisted: false },
      ]);
      expect(api.photos.upload).toHaveBeenCalledTimes(1);
      expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
        tags: { phase: 'read-file-before-upload' },
        extra: { name: 'a.jpg', size: 100, type: 'image/jpeg' },
      });
    });

    it('propagates alreadyExisted from the API response without treating it as a failure', async () => {
      useBaulesStore.setState({
        baules: [newBaul()],
        chapters: { [baulId]: [newChapter(chapterId, { photoCount: 0 })] },
      });

      const existingPhoto = newPhoto('existing-photo', { alreadyExisted: true });
      vi.mocked(api.photos.upload).mockResolvedValueOnce(existingPhoto);
      vi.mocked(api.photos.getAll).mockResolvedValue([existingPhoto]);
      vi.mocked(api.chapters.getAll).mockResolvedValue([newChapter(chapterId, { photoCount: 1 })]);

      const results = await uploadPhotos(baulId, chapterId, [
        { clientUploadId: 'c1', uploadBatchId: 'batch-1', file: fakeFile('a.jpg') },
      ]);

      expect(results).toEqual([{ clientUploadId: 'c1', photo: existingPhoto, alreadyExisted: true }]);
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('does not refetch or touch the chapter when every file fails', async () => {
      useBaulesStore.setState({
        baules: [newBaul()],
        chapters: { [baulId]: [newChapter(chapterId, { photoCount: 0 })] },
      });

      vi.mocked(api.photos.upload).mockRejectedValue(new Error('boom'));

      await uploadPhotos(baulId, chapterId, [{ clientUploadId: 'c1', uploadBatchId: 'batch-1', file: fakeFile('a.jpg') }]);

      expect(api.photos.getAll).not.toHaveBeenCalled();
      expect(useBaulesStore.getState().photos[chapterId]).toBeUndefined();
    });
  });

  describe('uploadPhotos (loose, chapterId null)', () => {
    it('appends uploaded photos to loosePhotos and fills in the baúl cover, without touching chapters', async () => {
      const existing = newPhoto('existing');
      useBaulesStore.setState({
        baules: [newBaul()],
        loosePhotos: { [baulId]: [existing.id] },
      });
      usePhotosStore.getState().upsertPhotos([existing]);

      const photo1 = newPhoto('photo-1');
      vi.mocked(api.photos.upload).mockResolvedValueOnce(photo1);

      const results = await uploadPhotos(baulId, null, [{ clientUploadId: 'c1', uploadBatchId: 'batch-1', file: fakeFile('a.jpg') }]);

      expect(results).toEqual([{ clientUploadId: 'c1', photo: photo1, alreadyExisted: false }]);
      expect(api.photos.upload).toHaveBeenCalledWith(baulId, null, expect.anything(), 'c1', undefined, 'batch-1');
      const state = useBaulesStore.getState();
      expect(state.loosePhotos[baulId]).toEqual([existing.id, photo1.id]);
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
        { clientUploadId: 'ok', uploadBatchId: 'batch-1', file: fakeFile('a.jpg') },
        { clientUploadId: 'fails', uploadBatchId: 'batch-1', file: fakeFile('b.jpg') },
      ]);

      expect(results).toEqual([
        { clientUploadId: 'ok', photo: photo1, alreadyExisted: false },
        { clientUploadId: 'fails', error: 'network down' },
      ]);
      expect(useBaulesStore.getState().loosePhotos[baulId]).toEqual([photo1.id]);
    });
  });

  describe('uploadPhotosWithChapter', () => {
    const items: UploadItem[] = [{ clientUploadId: 'c1', uploadBatchId: 'batch-1', file: fakeFile('a.jpg') }];

    it('delegates to uploadPhotos when targeting an existing chapter', async () => {
      useBaulesStore.setState({
        baules: [newBaul()],
        chapters: { [baulId]: [newChapter(chapterId, { photoCount: 0 })] },
      });
      const photo1 = newPhoto('photo-1');
      vi.mocked(api.photos.upload).mockResolvedValueOnce(photo1);
      vi.mocked(api.photos.getAll).mockResolvedValue([photo1]);

      const { results, chapterId: resolvedChapterId } = await uploadPhotosWithChapter(
        baulId, { type: 'existing', chapterId }, items
      );

      expect(resolvedChapterId).toBe(chapterId);
      expect(results).toEqual([{ clientUploadId: 'c1', photo: photo1, alreadyExisted: false }]);
      expect(api.photos.upload).toHaveBeenCalledWith(baulId, chapterId, expect.anything(), 'c1', undefined, 'batch-1');
    });

    it('delegates to uploadPhotos with a null chapterId when there is no target chapter', async () => {
      useBaulesStore.setState({ baules: [newBaul()], loosePhotos: {} });
      const photo1 = newPhoto('photo-1');
      vi.mocked(api.photos.upload).mockResolvedValueOnce(photo1);

      const { results, chapterId: resolvedChapterId } = await uploadPhotosWithChapter(
        baulId, { type: 'none' }, items
      );

      expect(resolvedChapterId).toBeNull();
      expect(results).toEqual([{ clientUploadId: 'c1', photo: photo1, alreadyExisted: false }]);
      expect(api.photos.upload).toHaveBeenCalledWith(baulId, null, expect.anything(), 'c1', undefined, 'batch-1');
    });
  });
});
