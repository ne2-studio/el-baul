import * as Sentry from '@sentry/react';
import { heicTo, isHeic } from 'heic-to';
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

async function createSelectedPhoto(file: File, previewSource: Blob | MediaSource = file): Promise<SelectedPhoto> {
  return {
    id: crypto.randomUUID(),
    file,
    preview: URL.createObjectURL(await resolvePreviewSource(file, previewSource)),
  };
}

// Most browsers/WebViews can't decode HEIC/HEIF (iPhone's default photo format) for an <img>,
// so the pre-upload preview would otherwise render broken. Decodes it to a JPEG blob just for
// that preview — the file actually uploaded is untouched; the server normalizes it for storage.
// Falls back to the raw source on any failure so a bad/unsupported file never blocks the flow.
async function resolvePreviewSource(file: File, previewSource: Blob | MediaSource): Promise<Blob | MediaSource> {
  if (!(previewSource instanceof Blob)) return previewSource;

  try {
    if (!(await isHeic(file))) return previewSource;
    return await heicTo({ blob: previewSource, type: 'image/jpeg', quality: 0.9 });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { phase: 'heic-preview-decode' },
      extra: { name: file.name, size: file.size, type: file.type },
    });
    return previewSource;
  }
}

// Reads a just-picked file into memory right away and wraps it in a fresh, Blob-backed
// File. On Android, `<input type=file>` grants Chrome only a transient content:// URI
// permission for the picked files; if the user takes a while before confirming, that
// grant can expire and later reads fail before the request reaches the server.
export async function materializeSelectedPhoto(file: File): Promise<SelectedPhoto | null> {
  try {
    const buffer = await file.arrayBuffer();
    const materialized = new File([buffer], file.name, { type: file.type, lastModified: file.lastModified });
    return await createSelectedPhoto(materialized);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { phase: 'read-file-on-select' },
      extra: { name: file.name, size: file.size, type: file.type },
    });
    return null;
  }
}

export async function materializeSharedPhoto(blob: Blob, name: string, mimeType: string): Promise<SelectedPhoto> {
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
