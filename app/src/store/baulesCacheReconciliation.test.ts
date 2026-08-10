import { describe, expect, it } from 'vitest';
import { Baul, Chapter, Photo } from '@/types';
import {
  applyCoverUpdate,
  applyMovedPhotos,
  applyUploadedPhotos,
  type BaulesCacheState,
} from './baulesCacheReconciliation';

const baulId = 'baul-1';
const chapterId = 'chapter-1';
const sourceChapterId = 'chapter-src';
const targetChapterId = 'chapter-target';

function cacheState(overrides: Partial<BaulesCacheState> = {}): BaulesCacheState {
  return {
    baules: [],
    chapters: {},
    photos: {},
    loosePhotos: {},
    photoBatchPhotos: {},
    ...overrides,
  };
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

describe('baules cache reconciliation', () => {
  describe('applyUploadedPhotos', () => {
    it('replaces the chapter photo id cache and fills unset baúl/chapter covers', () => {
      const photo1 = newPhoto('photo-1');
      const photo2 = newPhoto('photo-2');
      const state = cacheState({
        baules: [newBaul()],
        chapters: { [baulId]: [newChapter(chapterId, { photoCount: 0 })] },
      });

      const next = applyUploadedPhotos(state, {
        baulId,
        chapterId,
        uploaded: [photo1, photo2],
        photosForChapter: [photo1, photo2],
      });

      expect(next.photos[chapterId]).toEqual([photo1.id, photo2.id]);
      expect(next.chapters[baulId][0].photoCount).toBe(2);
      expect(next.chapters[baulId][0].coverPhotoUrl).toBe(photo1.thumbnailUrl);
      expect(next.baules[0].coverPhotoUrl).toBe(photo1.thumbnailUrl);
    });

    it('keeps the existing chapter photo ids when no refetched list is given', () => {
      const photo1 = newPhoto('photo-1');
      const state = cacheState({
        baules: [newBaul()],
        chapters: { [baulId]: [newChapter(chapterId, { photoCount: 0 })] },
        photos: { [chapterId]: ['already-there'] },
      });

      const next = applyUploadedPhotos(state, { baulId, chapterId, uploaded: [photo1] });

      expect(next.photos[chapterId]).toEqual(['already-there']);
    });

    it('appends loose upload ids without touching chapters', () => {
      const uploaded = newPhoto('uploaded');
      const state = cacheState({
        baules: [newBaul()],
        chapters: { [baulId]: [newChapter(chapterId)] },
        loosePhotos: { [baulId]: ['existing'] },
      });

      const next = applyUploadedPhotos(state, { baulId, chapterId: null, uploaded: [uploaded] });

      expect(next.loosePhotos[baulId]).toEqual(['existing', uploaded.id]);
      expect(next.chapters).toBe(state.chapters);
      expect(next.baules[0].coverPhotoUrl).toBe(uploaded.thumbnailUrl);
    });
  });

  describe('applyMovedPhotos', () => {
    it('removes moved photo ids from a source chapter and reconciles the target from server photos', () => {
      const moved = newPhoto('moved');
      const failed = newPhoto('failed');
      const targetPhotos = [moved, newPhoto('already-target')];
      const state = cacheState({
        chapters: {
          [baulId]: [
            newChapter(sourceChapterId, { photoCount: 2 }),
            newChapter(targetChapterId, { photoCount: 0 }),
          ],
        },
        photos: { [sourceChapterId]: [moved.id, failed.id] },
      });

      const next = applyMovedPhotos(state, {
        baulId,
        sourceChapterId,
        targetChapterId,
        movedPhotoIds: [moved.id],
        targetPhotos,
      });

      expect(next.photos[sourceChapterId]).toEqual([failed.id]);
      expect(next.photos[targetChapterId]).toEqual(targetPhotos.map((photo) => photo.id));
      expect(next.chapters[baulId].find((chapter) => chapter.id === sourceChapterId)?.photoCount).toBe(1);
      expect(next.chapters[baulId].find((chapter) => chapter.id === targetChapterId)?.photoCount).toBe(2);
      expect(next.chapters[baulId].find((chapter) => chapter.id === targetChapterId)?.coverPhotoUrl).toBe(moved.thumbnailUrl);
    });

    it('removes moved photo ids from loose photos when the source is virtual', () => {
      const moved = newPhoto('moved');
      const remaining = newPhoto('remaining');
      const state = cacheState({
        chapters: { [baulId]: [newChapter(targetChapterId)] },
        loosePhotos: { [baulId]: [moved.id, remaining.id] },
      });

      const next = applyMovedPhotos(state, {
        baulId,
        sourceChapterId: null,
        targetChapterId,
        movedPhotoIds: [moved.id],
        targetPhotos: [moved],
      });

      expect(next.loosePhotos[baulId]).toEqual([remaining.id]);
      expect(next.photos[targetChapterId]).toEqual([moved.id]);
    });
  });

  it('applyCoverUpdate changes only the requested entity', () => {
    const first = newBaul({ id: 'first', coverPhotoUrl: 'old' });
    const second = newBaul({ id: 'second', coverPhotoUrl: 'old' });

    expect(applyCoverUpdate([first, second], 'second', 'new')).toEqual([
      first,
      { ...second, coverPhotoUrl: 'new' },
    ]);
  });
});
