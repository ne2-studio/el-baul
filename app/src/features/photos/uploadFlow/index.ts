import * as Sentry from '@sentry/react';
import { Chapter, Photo, PhotoDate } from '@/types';

const LOOSE_PHOTOS_CHAPTER_ID = 'sueltas';
const LOOSE_PHOTOS_CHAPTER_NAME = 'Fotos sueltas';

export interface SelectedPhoto {
  id: string;
  file: File;
  preview: string;
}

export interface UploadItem {
  clientUploadId: string;
  file: File;
  date?: PhotoDate;
}

export type PhotoUploadDestination =
  | { type: 'existing'; chapterId: string }
  | { type: 'new'; name: string }
  | { type: 'none' };

export interface PhotoRouteContext {
  currentChapter: Chapter | undefined;
  basePath: string;
  destination: PhotoUploadDestination;
  apiChapterId: string | null;
}

function createSelectedPhoto(file: File, previewSource: Blob | MediaSource = file): SelectedPhoto {
  return {
    id: crypto.randomUUID(),
    file,
    preview: URL.createObjectURL(previewSource),
  };
}

// Reads a just-picked file into memory right away and wraps it in a fresh, Blob-backed
// File. On Android, `<input type=file>` grants Chrome only a transient content:// URI
// permission for the picked files; if the user takes a while before confirming, that
// grant can expire and later reads fail before the request reaches the server.
export async function materializeSelectedPhoto(file: File): Promise<SelectedPhoto | null> {
  try {
    const buffer = await file.arrayBuffer();
    const materialized = new File([buffer], file.name, { type: file.type, lastModified: file.lastModified });
    return createSelectedPhoto(materialized);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { phase: 'read-file-on-select' },
      extra: { name: file.name, size: file.size, type: file.type },
    });
    return null;
  }
}

export function materializeSharedPhoto(blob: Blob, name: string, mimeType: string): SelectedPhoto {
  const file = new File([blob], name, { type: mimeType });
  return createSelectedPhoto(file, blob);
}

function photoChapterPath(baulId: string, chapterId: string | null | undefined): string {
  return chapterId ? `/baules/${baulId}/capitulos/${chapterId}` : `/baules/${baulId}/fotos-sueltas`;
}

export function uploadItemsFromSelectedPhotos(selectedPhotos: SelectedPhoto[], date: PhotoDate | null): UploadItem[] {
  return selectedPhotos.map((photo) => ({
    clientUploadId: photo.id,
    file: photo.file,
    date: date ?? undefined,
  }));
}

function createLoosePhotosChapter(photos: Photo[]): Chapter {
  return {
    id: LOOSE_PHOTOS_CHAPTER_ID,
    name: LOOSE_PHOTOS_CHAPTER_NAME,
    photoCount: photos.length,
    coverPhotoUrl: photos[0]?.thumbnailUrl,
    lastUpdated: '',
    recuerdoCount: 0,
    undatedPhotoCount: photos.length,
  };
}

export function resolvePhotoRouteContext({
  baulId,
  chapterId,
  chapters,
  loosePhotos,
}: {
  baulId: string;
  chapterId: string | undefined;
  chapters: Chapter[];
  loosePhotos: Photo[];
}): PhotoRouteContext {
  const apiChapterId = chapterId ?? null;
  return {
    currentChapter: chapterForRoute(chapterId, chapters, loosePhotos),
    basePath: photoChapterPath(baulId, apiChapterId),
    destination: chapterId ? { type: 'existing', chapterId } : { type: 'none' },
    apiChapterId,
  };
}

function chapterForRoute(
  chapterId: string | undefined,
  chapters: Chapter[],
  loosePhotos: Photo[]
): Chapter | undefined {
  if (chapterId) return chapters.find((chapter) => chapter.id === chapterId);
  return createLoosePhotosChapter(loosePhotos);
}
