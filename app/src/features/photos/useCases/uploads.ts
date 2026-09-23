import { Capacitor } from '@capacitor/core';
import * as Sentry from '@sentry/react';
import { api } from '@/api';
import { Photo, PhotoAsset } from '@/types';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { useMyPhotosStore } from '@/store/useMyPhotosStore';
import { PhotoUploadDestination, UploadItem, UploadItemResult } from '@/features/photos/uploadFlow';
import { applyUploadedPhotos } from '@/store/baulesCacheReconciliation';
import { DevicePhoto, DevicePhotos } from '@/features/photos/native/devicePhotos';

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
        baulId, chapterId, selected.file, selected.clientUploadId, selected.uploadBatchId);
      uploaded.push(photo);
      result = { clientUploadId: selected.clientUploadId, photo, alreadyExisted: photo.alreadyExisted };
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

// Subida directa a Mis fotos (Slice 3, docs/.backlog issue #62): mismo pipeline de ingesta que
// uploadPhotos, sin baúl/capítulo de destino — cada foto crea/reutiliza su PhotoAsset canónico y
// la relación UserPhotoAsset del usuario, nunca un Photo (ver PhotoManager.UploadToMyPhotosAsync
// en el backend). Nunca falla como "AlreadyExisted": la deduplicación es transparente para el
// usuario, así que todo resultado sin error se trata como éxito.
export async function uploadToMyPhotos(
  selectedPhotos: UploadItem[],
  onItemSettled?: (result: UploadItemResult) => void
): Promise<UploadItemResult[]> {
  const results: UploadItemResult[] = [];
  const uploaded: PhotoAsset[] = [];
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
      const asset = await api.myPhotos.upload(selected.file, selected.clientUploadId);
      uploaded.push(asset);
      result = { clientUploadId: selected.clientUploadId, asset };
    } catch (error) {
      Sentry.captureException(error, { tags: { phase: 'upload-request' } });
      result = { clientUploadId: selected.clientUploadId, error: error instanceof Error ? error.message : 'Upload failed' };
    }
    results.push(result);
    onItemSettled?.(result);
  }

  if (uploaded.length > 0) {
    // Sólo se añaden a la lista ya cargada los que son elegibles para el filtro activo — un
    // duplicado exacto de una foto ya compartida a un baúl no pertenece a "Sin compartir" (ver
    // useMyPhotosStore.prependUploaded's doc comment).
    const filter = useMyPhotosStore.getState().filter;
    const eligible = filter === 'sin-compartir' ? uploaded.filter((asset) => asset.baules.length === 0) : uploaded;
    useMyPhotosStore.getState().prependUploaded(eligible);
  }

  return results;
}

// "Subir foto" from "En este dispositivo"'s 3-dot menu (GitHub issue #87) — per
// EnEsteDispositivoRoute's boundary note, a device photo is saved into Mis fotos, never
// straight into a baúl (the user can share it to a baúl afterwards from there, same as any
// other Mis fotos asset). Takes an array (not a single DevicePhoto) so #88's later multi-select
// batch upload can call this same function unchanged. Fully independent of "Borrar de este
// dispositivo" (#86): uploading never touches the device copy either way.
//
// Unlike every other upload entry point, there's no <input type=file> handing us a File/Blob to
// start from — DevicePhoto.fullUrl deliberately points at the cached grid thumbnail, never the
// original (see DevicePhoto's own doc comment), so this reads the actual original file via the
// new DevicePhotos.getOriginalPhoto plugin method first, then turns it into a File the same way
// loadShare (features/sharing/useCases) turns a SharedFile's native path into one.
export async function uploadDevicePhotosToMyPhotos(photos: DevicePhoto[]): Promise<UploadItemResult[]> {
  const uploadBatchId = crypto.randomUUID();
  const results: UploadItemResult[] = [];
  const uploadable: UploadItem[] = [];

  for (const photo of photos) {
    try {
      const original = await DevicePhotos.getOriginalPhoto({ id: photo.id });
      const webPath = Capacitor.convertFileSrc(original.uri);
      const response = await fetch(webPath);
      if (!response.ok) {
        throw new Error(`Device photo original fetch failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Device photo original fetch returned an empty blob');
      }

      const file = new File([blob], `device-photo-${photo.id}`, { type: original.mimeType });
      uploadable.push({ clientUploadId: photo.id, uploadBatchId, file });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { phase: 'read-device-photo-original' },
        extra: { id: photo.id },
      });
      results.push({ clientUploadId: photo.id, error: 'No se pudo leer la foto original (puede que ya no esté disponible)' });
    }
  }

  if (uploadable.length > 0) {
    results.push(...(await uploadToMyPhotos(uploadable)));
  }

  return results;
}
