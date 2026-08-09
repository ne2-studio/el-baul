import * as Sentry from '@sentry/react';
import { api } from '@/api';
import { Photo, PhotoDate } from '@/types';
import { usePersonasStore } from '@/store/usePersonasStore';
import { useBaulesStore } from '@/store/useBaulesStore';
import { PhotoUploadDestination, UploadItem, UploadItemResult } from '@/features/photos/uploadFlow';
import {
  applyMovedPhotos,
  applyUploadedPhotos,
} from '@/store/baulesCacheReconciliation';

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

export async function submitRemovalRequest(baulId: string, photo: { id: string }, reason: string): Promise<void> {
  await api.baules.submitRemovalRequest(baulId, photo.id, reason);
}

export async function loadRemovalRequests(baulId: string): Promise<void> {
  const removalRequests = await api.baules.getRemovalRequests(baulId);
  usePersonasStore.setState((state) => ({ removalRequests: { ...state.removalRequests, [baulId]: removalRequests } }));
}

export async function removePhoto(baulId: string, requestId: string, photoId: string): Promise<void> {
  await api.baules.approveRemovalRequest(baulId, requestId);
  useBaulesStore.getState().removePhotoFromCaches(photoId);
  usePersonasStore.getState().removePhotoFromCaches(photoId);
  usePersonasStore.setState((state) => ({
    removalRequests: {
      ...state.removalRequests,
      [baulId]: (state.removalRequests[baulId] || []).filter((r) => r.id !== requestId),
    },
  }));
}

export async function keepPhoto(baulId: string, requestId: string): Promise<void> {
  await api.baules.rejectRemovalRequest(baulId, requestId);
  usePersonasStore.setState((state) => ({
    removalRequests: {
      ...state.removalRequests,
      [baulId]: (state.removalRequests[baulId] || []).filter((r) => r.id !== requestId),
    },
  }));
}

export async function loadTaggedPersonas(photoId: string): Promise<void> {
  const taggedPersonas = await api.photos.getTaggedPersonas(photoId);
  usePersonasStore.setState((state) => ({ taggedPersonas: { ...state.taggedPersonas, [photoId]: taggedPersonas } }));
}

export async function setTaggedPersonas(photoId: string, personaIds: string[]): Promise<void> {
  const taggedPersonas = await api.photos.setTaggedPersonas(photoId, personaIds);
  usePersonasStore.setState((state) => ({ taggedPersonas: { ...state.taggedPersonas, [photoId]: taggedPersonas } }));
}

// Sin store que actualizar: a diferencia de setTaggedPersonas, esta acción no produce ningún
// dato que otra pantalla necesite leer — solo evita que ContributionSuggestionContainer vuelva
// a proponer esta foto.
export async function confirmPhotoHasNoPersonas(photoId: string): Promise<void> {
  await api.photos.confirmNoPersonas(photoId);
}

export async function loadChapterPhotos(chapterId: string): Promise<void> {
  const photos = await api.photos.getAll(chapterId);
  useBaulesStore.setState((state) => ({ photos: { ...state.photos, [chapterId]: photos } }));
}

export async function loadLoosePhotos(baulId: string): Promise<void> {
  const photos = await api.baules.getLoosePhotos(baulId);
  useBaulesStore.setState((state) => ({ loosePhotos: { ...state.loosePhotos, [baulId]: photos } }));
}

// One upload batch's own photos — backs the feed card's grid/gallery drill-down (see
// PhotoBatchGridRoute/PhotoBatchViewerRoute).
export async function loadPhotoBatchPhotos(baulId: string, batchId: string): Promise<void> {
  const photos = await api.photoBatches.getPhotos(baulId, batchId);
  useBaulesStore.setState((state) => ({ photoBatchPhotos: { ...state.photoBatchPhotos, [batchId]: photos } }));
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

// Cada foto se mueve con su propia petición y su propio try/catch — igual que
// uploadPhotos — para que un fallo a mitad de lote no aborte el resto ni deje el
// store desincronizado con lo que sí se movió server-side (bug real: la versión
// anterior lanzaba en el primer fallo sin haber reconciliado nada). Si hay algún
// fallo se lanza al final, tras reconciliar los que sí tuvieron éxito, para que el
// toast de error del caller siga disparándose.
export async function movePhotos(
  baulId: string,
  sourceChapterId: string | null,
  photoIds: string[],
  targetChapterId: string,
  onItemSettled?: (result: { photoId: string; error?: string }) => void
): Promise<void> {
  const succeededIds: string[] = [];
  let failedCount = 0;
  for (const photoId of photoIds) {
    try {
      await api.photos.move(photoId, targetChapterId);
      succeededIds.push(photoId);
      onItemSettled?.({ photoId });
    } catch (error) {
      failedCount += 1;
      onItemSettled?.({ photoId, error: error instanceof Error ? error.message : 'No se pudo mover la foto' });
    }
  }

  if (succeededIds.length === 0) {
    throw new Error(`No se pudo mover ninguna de las ${photoIds.length} fotos`);
  }

  // Re-fetch the target chapter's photos from the server rather than merging
  // client-side — the target may not have been loaded into the store yet
  // (e.g. moving into a chapter the user hasn't opened this session), and a
  // client-side merge against an empty/stale slice would silently drop its
  // existing photos.
  // Re-fetch chapters too so aggregate chapter card metadata (especially date
  // ranges) is updated after creating a chapter from selected photos.
  const [targetPhotos, chaptersForBaul] = await Promise.all([
    api.photos.getAll(targetChapterId),
    api.chapters.getAll(baulId),
  ]);

  useBaulesStore.setState((state) => applyMovedPhotos(state, {
    baulId,
    sourceChapterId,
    targetChapterId,
    movedPhotoIds: succeededIds,
    targetPhotos,
    chaptersForBaul,
  }));

  if (failedCount > 0) {
    throw new Error(`${failedCount} de ${photoIds.length} fotos no se pudieron mover`);
  }
}

// Sin chapterId: quien llama (cualquiera de los dos visores de fotos) no necesariamente sabe
// bajo qué capítulo/foto suelta está cacheada esta foto, así que se invalidan ambas cachés
// (baúles y personas) allá donde estén, sin arrastrar el "origen". Los capítulos se
// refrescan siempre — puede que la foto perteneciera a uno y sus metadatos agregados
// (fecha, portada, contadores) hayan cambiado.
export async function deletePhoto(baulId: string, photoId: string, reason?: string): Promise<void> {
  await api.photos.delete(photoId, reason);

  useBaulesStore.getState().removePhotoFromCaches(photoId);
  usePersonasStore.getState().removePhotoFromCaches(photoId);

  const chapters = await api.chapters.getAll(baulId);
  useBaulesStore.setState((state) => ({ chapters: { ...state.chapters, [baulId]: chapters } }));
}

export async function changePhotoDate(baulId: string, photoId: string, date: PhotoDate): Promise<void> {
  const updated = await api.photos.changeDate(photoId, date);
  useBaulesStore.getState().updatePhotoInCaches(updated);
  usePersonasStore.getState().updatePhotoInCaches(updated);

  const chapters = await api.chapters.getAll(baulId);
  useBaulesStore.setState((state) => ({ chapters: { ...state.chapters, [baulId]: chapters } }));
}
