import * as Sentry from '@sentry/react';
import { Chapter, Photo, PhotoAsset } from '@/types';

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
  // Populated instead of `photo` by uploadToMyPhotos (Slice 3, docs/.backlog issue #62) — Mis
  // fotos ingests a PhotoAsset, never a baúl-scoped Photo. UploadingScreen itself never reads
  // either field, only onSettled callers do.
  asset?: PhotoAsset;
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

// Where "< Volver" should land once the whole upload wizard is done (confirmar -> subiendo ->
// the resulting PhotoBatchGridRoute) — the tab/chapter the user was on when they tapped "Subir
// fotos". Carried purely via router state through every step (see UploadConfirmationRoute,
// UploadingRoute, PhotoBatchGridRoute), never persisted: a reload or deep link into the middle
// of the wizard simply loses it, same convention as the rest of this flow's state.
export interface UploadReturnTo {
  pathname: string;
  state?: unknown;
}

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
// Decodes straight to an ImageBitmap and downscales it here rather than asking heic-to for a
// full-resolution JPEG (its default) and letting downscaleForPreview shrink *that* afterwards —
// the latter means decoding and re-encoding the image twice at full camera resolution (easily
// tens of megapixels) just to throw away everything but a 480px preview. Falls back to the raw
// source on any failure so a bad/unsupported file never blocks the flow.
async function resolvePreviewSource(file: File, previewSource: Blob | MediaSource): Promise<Blob | MediaSource> {
  if (!(previewSource instanceof Blob)) return previewSource;

  try {
    const { heicTo, isHeic } = await import('heic-to');
    if (!(await isHeic(file))) return previewSource;

    const bitmap = await heicTo({ blob: previewSource, type: 'bitmap' });
    try {
      return await downscaleBitmap(bitmap);
    } finally {
      bitmap.close();
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { phase: 'heic-preview-decode' },
      extra: { name: file.name, size: file.size, type: file.type },
    });
    return previewSource;
  }
}

// Downscales an already-decoded HEIC bitmap straight to preview size in a single canvas pass —
// shared by downscaleForPreview (see below), which decodes every other already-compressed Blob
// source to a bitmap the same way; this skips that redundant decode step for HEIC, whose source
// heic-to already handed us as a bitmap.
async function downscaleBitmap(bitmap: ImageBitmap): Promise<Blob> {
  const { width, height } = bitmap;
  const scale = Math.min(1, PREVIEW_MAX_DIMENSION / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable for HEIC preview downscale');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const thumbnail = await canvasToBlob(canvas);
  if (!thumbnail) throw new Error("Can't convert canvas to blob for HEIC preview");
  return thumbnail;
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
//
// Decodes via createImageBitmap rather than an <img>-element load: a file picked from Android's
// Google Photos provider can resolve, on the native side, to a "hardware bitmap" that some
// WebViews composite as solid black when an <img> sourced from it is drawn into a 2D <canvas> —
// createImageBitmap decodes the blob's own bytes entirely inside Chromium instead, never
// touching that native Bitmap, so it isn't exposed to that failure mode. It also surfaces a
// corrupt/incomplete decode as a rejected promise instead of a silently-black <img>.load().
async function downscaleForPreview(source: Blob, file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(source);
    try {
      if (Math.max(bitmap.width, bitmap.height) <= PREVIEW_MAX_DIMENSION) return source;
      return await downscaleBitmap(bitmap);
    } finally {
      bitmap.close();
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { phase: 'preview-downscale' },
      extra: { name: file.name, size: file.size, type: file.type, ...(await diagnosticFingerprint(source)) },
    });
    return source;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
}

// How many bytes of the undecodable blob's head/tail to hex-dump alongside the Sentry event
// above — enough to see the magic bytes, an APP0/APP1 header, and (from the tail) whether the
// stream was cut off before EOI, without ballooning the event payload.
const DIAGNOSTIC_BYTES = 64;

// Temporary forensic snapshot attached to downscaleForPreview's Sentry event, for diagnosing why
// a real, on-device "createImageBitmap can't decode this" image is undecodable — see docs/
// .backlog issue #82. By the time a picked file reaches here it can't be re-obtained afterwards
// (an Android content:// picker hands out transient, re-encoded-on-demand bytes — see
// materializeSelectedPhoto below — so even the same-looking photo downloaded normally afterwards
// is provably different bytes), so this is the only way to see what's actually wrong with them.
// Never throws: a failure here must not mask the original decode error it's attached to.
async function diagnosticFingerprint(blob: Blob): Promise<Record<string, unknown>> {
  try {
    const buffer = new Uint8Array(await blob.arrayBuffer());
    return {
      byteLength: buffer.length,
      headHex: toHex(buffer.subarray(0, DIAGNOSTIC_BYTES)),
      tailHex: toHex(buffer.subarray(Math.max(0, buffer.length - DIAGNOSTIC_BYTES))),
      jpegMarkers: walkJpegMarkers(buffer),
    };
  } catch (fingerprintError) {
    return { fingerprintError: String(fingerprintError) };
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Walks JPEG segment markers from SOI up to (and including) the first SOS — enough to see how
// this image is actually encoded (baseline vs progressive vs one of the rarer/unsupported SOF
// variants — arithmetic-coded, lossless, 12-bit — plus chroma subsampling and any APPn/ICC/COM
// segments in between) without decoding a single pixel. Returns a short label instead of walking
// garbage when the buffer isn't even a JPEG (wrong magic bytes) or the walk runs off the rails.
function walkJpegMarkers(buffer: Uint8Array): string[] | string {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return 'not a JPEG (bad SOI)';

  const markers: string[] = [];
  let i = 2;
  while (i < buffer.length - 1) {
    if (buffer[i] !== 0xff) return [...markers, `desync at offset ${i}`];
    const marker = buffer[i + 1];

    // Markers with no length-prefixed payload: RST0-7 and the bare TEM marker.
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      markers.push(`0xFF${marker.toString(16).padStart(2, '0')}@${i}`);
      i += 2;
      continue;
    }
    if (marker === 0xd9) {
      markers.push(`EOI@${i}`);
      break;
    }
    if (i + 3 >= buffer.length) return [...markers, `truncated segment header at offset ${i}`];

    const length = (buffer[i + 2] << 8) | buffer[i + 3];
    // SOFn markers (0xC0-0xCF) except DHT/JPG/DAC (0xC4/0xC8/0xCC) carry precision/dimensions —
    // exactly what distinguishes a plain baseline JPEG from the exotic variants above.
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    const detail = isSof && i + 9 < buffer.length
      ? ` precision=${buffer[i + 4]} ${(buffer[i + 7] << 8) | buffer[i + 8]}x${(buffer[i + 5] << 8) | buffer[i + 6]} components=${buffer[i + 9]}`
      : '';
    markers.push(`0xFF${marker.toString(16).padStart(2, '0')}@${i} len=${length}${detail}`);
    if (marker === 0xda) break; // SOS reached — entropy-coded data follows, stop walking segments
    i += 2 + length;
  }
  return markers;
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
