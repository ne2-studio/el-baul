import { Baul, Chapter, Photo } from '@/types';

// photos/loosePhotos/photoBatchPhotos hold photo ids, not Photo objects — see usePhotosStore
// for why (it's the canonical source for a photo's own fields; these are membership lists).
export interface BaulesCacheState {
  baules: Baul[];
  chapters: Record<string, Chapter[]>;
  photos: Record<string, string[]>;
  loosePhotos: Record<string, string[]>;
  photoBatchPhotos: Record<string, string[]>;
}

export function applyUploadedPhotos(
  state: BaulesCacheState,
  params: {
    baulId: string;
    chapterId: string | null;
    uploaded: Photo[];
    photosForChapter?: Photo[];
    chaptersForBaul?: Chapter[];
  }
): Pick<BaulesCacheState, 'baules' | 'chapters' | 'photos' | 'loosePhotos'> {
  const { baulId, chapterId, uploaded, photosForChapter, chaptersForBaul } = params;
  const firstThumbnail = uploaded[0]?.thumbnailUrl;

  if (chapterId) {
    const chapters = chaptersForBaul ?? (state.chapters[baulId] || []).map((chapter) =>
      chapter.id === chapterId
        ? {
            ...chapter,
            photoCount: chapter.photoCount + uploaded.length,
            coverPhotoUrl: chapter.coverPhotoUrl || firstThumbnail,
          }
        : chapter
    );

    return {
      photos: {
        ...state.photos,
        [chapterId]: photosForChapter ? photosForChapter.map((photo) => photo.id) : (state.photos[chapterId] ?? []),
      },
      chapters: {
        ...state.chapters,
        [baulId]: chapters,
      },
      baules: fillBaulCover(state.baules, baulId, firstThumbnail),
      loosePhotos: state.loosePhotos,
    };
  }

  return {
    loosePhotos: {
      ...state.loosePhotos,
      [baulId]: [...(state.loosePhotos[baulId] || []), ...uploaded.map((photo) => photo.id)],
    },
    baules: fillBaulCover(state.baules, baulId, firstThumbnail),
    chapters: state.chapters,
    photos: state.photos,
  };
}

export function applyMovedPhotos(
  state: BaulesCacheState,
  params: {
    baulId: string;
    sourceChapterId: string | null;
    targetChapterId: string;
    movedPhotoIds: string[];
    targetPhotos: Photo[];
    chaptersForBaul?: Chapter[];
  }
): Pick<BaulesCacheState, 'chapters' | 'photos' | 'loosePhotos'> {
  const { baulId, sourceChapterId, targetChapterId, movedPhotoIds, targetPhotos, chaptersForBaul } = params;
  const movedIds = new Set(movedPhotoIds);
  const sourcePhotoIds = sourceChapterId ? (state.photos[sourceChapterId] || []) : (state.loosePhotos[baulId] || []);
  const movedCount = sourcePhotoIds.filter((id) => movedIds.has(id)).length;
  const remainingSourcePhotoIds = sourcePhotoIds.filter((id) => !movedIds.has(id));
  const chapters = chaptersForBaul ?? (state.chapters[baulId] || []).map((chapter) => {
    if (sourceChapterId && chapter.id === sourceChapterId) {
      return { ...chapter, photoCount: Math.max(0, chapter.photoCount - movedCount) };
    }
    if (chapter.id === targetChapterId) {
      return {
        ...chapter,
        photoCount: targetPhotos.length,
        coverPhotoUrl: chapter.coverPhotoUrl || targetPhotos[0]?.thumbnailUrl,
      };
    }
    return chapter;
  });

  return {
    photos: {
      ...state.photos,
      ...(sourceChapterId ? { [sourceChapterId]: remainingSourcePhotoIds } : {}),
      [targetChapterId]: targetPhotos.map((photo) => photo.id),
    },
    loosePhotos: sourceChapterId
      ? state.loosePhotos
      : { ...state.loosePhotos, [baulId]: remainingSourcePhotoIds },
    chapters: {
      ...state.chapters,
      [baulId]: chapters,
    },
  };
}

export function applyCoverUpdate<T extends { id: string; coverPhotoUrl?: string }>(
  items: T[],
  itemId: string,
  coverPhotoUrl: string
): T[] {
  return items.map((item) => (item.id === itemId ? { ...item, coverPhotoUrl } : item));
}

function fillBaulCover(baules: Baul[], baulId: string, thumbnailUrl?: string): Baul[] {
  if (!thumbnailUrl) return baules;
  return baules.map((baul) => (
    baul.id === baulId ? { ...baul, coverPhotoUrl: baul.coverPhotoUrl || thumbnailUrl } : baul
  ));
}
