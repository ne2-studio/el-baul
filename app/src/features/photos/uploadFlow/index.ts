import * as Sentry from '@sentry/react';
import { Chapter, Photo } from '@/types';

const LOOSE_PHOTOS_CHAPTER_ID = 'sueltas';
const LOOSE_PHOTOS_CHAPTER_NAME = 'Fotos sueltas';

export interface SelectedPhoto {
  id: string;
  file: File;
  preview: string;
}

export interface UploadItem {
  clientUploadId: string;
  // Shared by every UploadItem built from the same uploadItemsFromSelectedPhotos call — one
  // client action, one batch — unlike clientUploadId, which is unique per photo. Powers the
  // baúl feed's "N fotos subidas" cards (see IPhotoUploadBatchReadModel on the backend).
  uploadBatchId: string;
  file: File;
}

// The upload use case's result shape lives here (not in useCases/) so presentational
// components that render upload progress can type their props against it without an
// import-boundary violation — see eslint.config.js's componentBoundaryRule.
export interface UploadItemResult {
  clientUploadId: string;
  photo?: Photo;
  error?: string;
  // true cuando el backend detectó que estos bytes ya estaban en el baúl (ver
  // Photo.alreadyExisted) — un resultado exitoso, nunca un error: nunca cuenta como fallo, ni
  // dispara el flujo de reintento. Ver uploads.ts y UploadingRoute, que lo usan para separar
  // "subidas nuevas" de "ya estaba" en el mensaje final.
  alreadyExisted?: boolean;
}

export type PhotoUploadDestination =
  | { type: 'existing'; chapterId: string }
  | { type: 'none' };

export interface PhotoRouteContext {
  currentChapter: Chapter | undefined;
  basePath: string;
  destination: PhotoUploadDestination;
  apiChapterId: string | null;
}

async function createSelectedPhoto(file: File, previewSource: Blob | MediaSource = file): Promise<SelectedPhoto> {
  const resolved = await resolvePreviewSource(file, previewSource);
  return {
    id: crypto.randomUUID(),
    file,
    preview: URL.createObjectURL(resolved instanceof Blob ? await downscaleForPreview(resolved, file) : resolved),
  };
}

// Most browsers/WebViews can't decode HEIC/HEIF (iPhone's default photo format) for an <img>,
// so the pre-upload preview would otherwise render broken. Decodes it to a JPEG blob just for
// that preview — the file actually uploaded is untouched; the server normalizes it for storage.
// Falls back to the raw source on any failure so a bad/unsupported file never blocks the flow.
async function resolvePreviewSource(file: File, previewSource: Blob | MediaSource): Promise<Blob | MediaSource> {
  if (!(previewSource instanceof Blob)) return previewSource;

  try {
    const { heicTo, isHeic } = await import('heic-to');
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

// The longer side a pre-upload preview is downscaled to — comfortably above what a 3-column
// grid on a phone screen ever displays a single tile at, so it still looks crisp there.
const PREVIEW_MAX_DIMENSION = 480;

// UploadConfirmationScreen/UploadingScreen render `preview` as an <img src> for every picked
// photo at once (see issue #36). Painting the original, full-resolution blob there — easily
// tens of megapixels straight off a phone camera — makes that grid unresponsive: decoding and
// compositing that many full-size bitmaps blocks the main thread. Downscaling to a small JPEG
// here keeps those two screens fast without touching either of them, and without touching
// `file`/the upload itself, which stays the untouched original for storage. Falls back to the
// un-downscaled source on any failure so a bad/unsupported image never blocks the flow.
async function downscaleForPreview(source: Blob, file: File): Promise<Blob> {
  const sourceUrl = URL.createObjectURL(source);
  try {
    const image = await loadImage(sourceUrl);
    const { naturalWidth: width, naturalHeight: height } = image;
    if (!width || !height) return source;

    const scale = Math.min(1, PREVIEW_MAX_DIMENSION / Math.max(width, height));
    if (scale === 1) return source;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext('2d');
    if (!context) return source;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const thumbnail = await canvasToBlob(canvas);
    return thumbnail ?? source;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { phase: 'preview-downscale' },
      extra: { name: file.name, size: file.size, type: file.type },
    });
    return source;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image failed to load for preview downscaling'));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
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

// Shared by the <input type=file> change handler and desktop drag-and-drop: materializes
// every file and separates out the ones that failed to read instead of silently dropping them.
export async function materializeFileList(files: File[]): Promise<{ selectedPhotos: SelectedPhoto[]; droppedCount: number }> {
  const materialized = await Promise.all(files.map(materializeSelectedPhoto));
  const selectedPhotos = materialized.filter((photo): photo is SelectedPhoto => photo !== null);
  return { selectedPhotos, droppedCount: materialized.length - selectedPhotos.length };
}

// Builds the final toast for a fully-succeeded upload batch — "already existed" photos are a
// successful, expected outcome (see docs/.backlog issue #20, addendum de UX), never rendered as
// an error and never mentioned with technical terms (duplicado, hash, etc.). Both counts are
// callers' successful results only — a failed upload never reaches this helper (see
// UploadingRoute.handleSettled, the only caller).
export function uploadResultMessage(newlyUploadedCount: number, alreadyExistedCount: number): string {
  if (alreadyExistedCount === 0) {
    return newlyUploadedCount === 1 ? 'Tu recuerdo ya está a salvo' : `Tus ${newlyUploadedCount} recuerdos ya están a salvo`;
  }

  if (newlyUploadedCount === 0) {
    return alreadyExistedCount === 1 ? 'Esta foto ya estaba en el baúl' : 'Estas fotos ya estaban en el baúl';
  }

  const uploadedPart = newlyUploadedCount === 1 ? '1 foto subida' : `${newlyUploadedCount} fotos subidas`;
  const existedPart = alreadyExistedCount === 1 ? '1 ya estaba en el baúl' : `${alreadyExistedCount} ya estaban en el baúl`;
  return `${uploadedPart} · ${existedPart}`;
}

function photoChapterPath(baulId: string, chapterId: string | null | undefined): string {
  return chapterId ? `/baules/${baulId}/capitulos/${chapterId}` : `/baules/${baulId}/fotos-sueltas`;
}

export function uploadItemsFromSelectedPhotos(selectedPhotos: SelectedPhoto[]): UploadItem[] {
  // One id per call, shared by every item — this is the single point where a set of picked
  // photos becomes "one upload action" (see UploadingRoute, the only caller of
  // uploadPhotosWithChapter/uploadPhotos).
  const uploadBatchId = crypto.randomUUID();
  return selectedPhotos.map((photo) => ({
    clientUploadId: photo.id,
    uploadBatchId,
    file: photo.file,
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
