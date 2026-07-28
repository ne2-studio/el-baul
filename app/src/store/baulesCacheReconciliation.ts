import { Baul, Chapter, Photo } from '@/types';

export interface BaulesCacheState {
  baules: Baul[];
  chapters: Record<string, Chapter[]>;
  photos: Record<string, Photo[]>;
  loosePhotos: Record<string, Photo[]>;
}

export interface LooseChapterView {
  id: null;
  name: 'Fotos sueltas';
  photoCount: number;
  coverPhotoUrls: string[];
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
        [chapterId]: photosForChapter ?? state.photos[chapterId] ?? [],
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
      [baulId]: [...(state.loosePhotos[baulId] || []), ...uploaded],
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
  const sourcePhotos = sourceChapterId ? (state.photos[sourceChapterId] || []) : (state.loosePhotos[baulId] || []);
  const movedCount = sourcePhotos.filter((photo) => movedIds.has(photo.id)).length;
  const remainingSourcePhotos = sourcePhotos.filter((photo) => !movedIds.has(photo.id));
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
      ...(sourceChapterId ? { [sourceChapterId]: remainingSourcePhotos } : {}),
      [targetChapterId]: targetPhotos,
    },
    loosePhotos: sourceChapterId
      ? state.loosePhotos
      : { ...state.loosePhotos, [baulId]: remainingSourcePhotos },
    chapters: {
      ...state.chapters,
      [baulId]: chapters,
    },
  };
}

export function applyDeletedPhoto(
  state: BaulesCacheState,
  params: { baulId: string; chapterId: string | null; photoId: string }
): Pick<BaulesCacheState, 'photos' | 'loosePhotos'> {
  const { baulId, chapterId, photoId } = params;
  if (chapterId) {
    return {
      photos: {
        ...state.photos,
        [chapterId]: (state.photos[chapterId] || []).filter((photo) => photo.id !== photoId),
      },
      loosePhotos: state.loosePhotos,
    };
  }

  return {
    photos: state.photos,
    loosePhotos: {
      ...state.loosePhotos,
      [baulId]: (state.loosePhotos[baulId] || []).filter((photo) => photo.id !== photoId),
    },
  };
}

export function applyPhotoDateUpdate(
  state: BaulesCacheState,
  params: { baulId: string; chapterId: string | null; updatedPhotos: Photo[] }
): Pick<BaulesCacheState, 'photos' | 'loosePhotos'> {
  const { baulId, chapterId, updatedPhotos } = params;
  const updatedById = new Map(updatedPhotos.map((photo) => [photo.id, photo]));

  if (chapterId) {
    return {
      photos: {
        ...state.photos,
        [chapterId]: (state.photos[chapterId] || []).map((photo) => updatedById.get(photo.id) || photo),
      },
      loosePhotos: state.loosePhotos,
    };
  }

  return {
    photos: state.photos,
    loosePhotos: {
      ...state.loosePhotos,
      [baulId]: (state.loosePhotos[baulId] || []).map((photo) => updatedById.get(photo.id) || photo),
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

export function removePhotoFromAllCaches(
  state: Pick<BaulesCacheState, 'photos' | 'loosePhotos'>,
  photoId: string
): Pick<BaulesCacheState, 'photos' | 'loosePhotos'> {
  const photos = Object.fromEntries(
    Object.entries(state.photos).map(([chapterId, chapterPhotos]) => [
      chapterId,
      chapterPhotos.filter((photo) => photo.id !== photoId),
    ])
  );
  const loosePhotos = Object.fromEntries(
    Object.entries(state.loosePhotos).map(([baulId, baulLoosePhotos]) => [
      baulId,
      baulLoosePhotos.filter((photo) => photo.id !== photoId),
    ])
  );

  return { photos, loosePhotos };
}

export function makeLooseChapterView(loosePhotos: Array<{ thumbnailUrl: string }>): LooseChapterView | null {
  if (loosePhotos.length === 0) return null;

  return {
    id: null,
    name: 'Fotos sueltas',
    photoCount: loosePhotos.length,
    coverPhotoUrls: loosePhotos.slice(0, 9).map((photo) => photo.thumbnailUrl),
  };
}

function fillBaulCover(baules: Baul[], baulId: string, thumbnailUrl?: string): Baul[] {
  if (!thumbnailUrl) return baules;
  return baules.map((baul) => (
    baul.id === baulId ? { ...baul, coverPhotoUrl: baul.coverPhotoUrl || thumbnailUrl } : baul
  ));
}
