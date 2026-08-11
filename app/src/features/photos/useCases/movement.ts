import { api } from '@/api';
import { useBaulesStore } from '@/store/useBaulesStore';
import { usePhotosStore } from '@/store/usePhotosStore';
import { applyMovedPhotos } from '@/store/baulesCacheReconciliation';

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

  usePhotosStore.getState().upsertPhotos(targetPhotos);
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
