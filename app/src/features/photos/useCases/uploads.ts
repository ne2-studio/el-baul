import * as Sentry from '@sentry/react';
import { api } from '@/api';
import { Photo } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { PhotoUploadDestination, UploadItem, UploadItemResult } from '@/features/photos/uploadFlow';
import { applyUploadedPhotos } from '@/store/baulesCacheReconciliation';

// Confirms the File/Blob still has readable bytes before we try to upload it. Files
// picked a while ago (the chapter/date step can add a real delay before the user hits
// confirm) have occasionally failed to upload in production with a bare
// `TypeError: Failed to fetch` and zero backend logs — consistent with the browser
// failing to read the file while building the multipart body, before any request ever
// reaches the network. Tagging this phase separately in Sentry tells that case apart
// from an actual network/proxy failure on the next occurrence.
async function verifyFileReadable(file: File): Promise<void> {
  await file.slice(0, 16).arrayBuffer();
}

function initialTargetChapterId(destination: PhotoUploadDestination): string | null {
  return destination.type === 'existing' ? destination.chapterId : null;
}

export async function uploadPhotos(
  baulId: string,
  chapterId: string | null,
  selectedPhotos: UploadItem[],
  onItemSettled?: (result: UploadItemResult) => void
): Promise<UploadItemResult[]> {
  const uploaded: Photo[] = [];
  const results: UploadItemResult[] = [];
  for (const selected of selectedPhotos) {
    let result: UploadItemResult;
    try {
      await verifyFileReadable(selected.file);
    } catch (readError) {
      Sentry.captureException(readError, {
        tags: { phase: 'read-file-before-upload' },
        extra: { name: selected.file.name, size: selected.file.size, type: selected.file.type },
      });
      result = { clientUploadId: selected.clientUploadId, error: 'No se pudo leer la foto (puede que ya no esté disponible)' };
      results.push(result);
      onItemSettled?.(result);
      continue;
    }
    try {
      const photo = await api.photos.upload(
        baulId, chapterId, selected.file, selected.clientUploadId, selected.date, selected.uploadBatchId);
      uploaded.push(photo);
      result = { clientUploadId: selected.clientUploadId, photo };
    } catch (error) {
      Sentry.captureException(error, { tags: { phase: 'upload-request' } });
      result = { clientUploadId: selected.clientUploadId, error: error instanceof Error ? error.message : 'Upload failed' };
    }
    results.push(result);
    onItemSettled?.(result);
  }

  if (uploaded.length > 0) {
    usePhotosStore.getState().upsertPhotos(uploaded);
    if (chapterId) {
      // Re-fetch the chapter's full photo list from the server rather than appending
      // client-side — the chapter may not have been loaded into the store yet (e.g.
      // uploading via the native share flow into a chapter never opened this session),
      // and an append onto an empty/stale slice would silently drop its existing photos.
      // Mirrors the same fix already applied in movePhotos.
      //
      // Re-fetch chapters too: chapter cards display aggregate metadata (date range,
      // undated count, ordering) computed server-side from their photos. Without this,
      // a newly-created chapter receiving dated photos stayed visible without dates until
      // the user left and re-entered the baúl.
      const [photosForChapter, chaptersForBaul] = await Promise.all([
        api.photos.getAll(chapterId),
        api.chapters.getAll(baulId),
      ]);
      usePhotosStore.getState().upsertPhotos(photosForChapter);
      useBaulesStore.setState((state) => applyUploadedPhotos(state, { baulId, chapterId, uploaded, photosForChapter, chaptersForBaul }));
    } else {
      useBaulesStore.setState((state) => applyUploadedPhotos(state, { baulId, chapterId, uploaded }));
    }
  }

  return results;
}

export async function uploadPhotosWithChapter(
  baulId: string,
  chapter: PhotoUploadDestination,
  selectedPhotos: UploadItem[],
  onItemSettled?: (result: UploadItemResult) => void
): Promise<{ results: UploadItemResult[]; chapterId: string | null }> {
  const targetChapterId = initialTargetChapterId(chapter);
  const results = await uploadPhotos(baulId, targetChapterId, selectedPhotos, onItemSettled);

  return { results, chapterId: targetChapterId };
}
