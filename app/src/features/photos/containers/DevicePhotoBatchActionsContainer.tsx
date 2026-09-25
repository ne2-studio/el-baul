import React from 'react';
import { usePostHog } from 'posthog-js/react';
import { DevicePhotoBatchActionsBar } from '@/features/photos/components/DevicePhotoBatchActionsBar';
import { useUIStore } from '@/store/uiStore';
import { useDevicePhotosStore } from '@/store/useDevicePhotosStore';
import { deleteDevicePhotos, uploadDevicePhotosToMyPhotos } from '@/features/photos/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';

interface DevicePhotoBatchActionsContainerProps {
  active: boolean;
  selectedIds: Set<string>;
  onDone: (remainingIds?: string[]) => void;
}

// Self-sufficient (docs/architecture/frontend.md's containers/ rule): la barra de acciones en
// lote de "En este dispositivo" (GitHub issue #88) — mismo espíritu que
// MyPhotosBatchActionsContainer, pero batcheando las dos acciones que useDevicePhotoViewerActions
// ya resolvía por foto (issues #86/#87): ambos casos de uso son array-first desde su introducción
// precisamente para este momento, así que se reutilizan sin cambios. Lee `photos` directamente de
// useDevicePhotosStore (en vez de recibirlas por prop) porque uploadDevicePhotosToMyPhotos
// necesita el DevicePhoto completo, no solo el id — la selección está siempre acotada a lo que ya
// hay cargado en pantalla (ver el refinamiento del issue), así que basta con lo que ya hay en el
// store.
export function DevicePhotoBatchActionsContainer({ active, selectedIds, onDone }: DevicePhotoBatchActionsContainerProps) {
  const { run } = useAsyncAction();
  const posthog = usePostHog();
  const showToastMessage = useUIStore((state) => state.showToastMessage);
  const photos = useDevicePhotosStore((state) => state.photos);

  const handleBatchUpload = async (): Promise<void> => {
    const ids = Array.from(selectedIds);
    const selectedPhotos = (photos ?? []).filter((photo) => selectedIds.has(photo.id));
    const result = await run(() => uploadDevicePhotosToMyPhotos(selectedPhotos), {
      errorMessage: 'Error al subir las fotos',
    });
    if (!result.ok) return;

    // uploadDevicePhotosToMyPhotos nunca lanza por foto — un fallo individual (original
    // ilegible, subida rechazada) llega como UploadItemResult.error, mismo convenio que el
    // resto de casos de uso de subida (ver uploads.ts).
    const failed = result.value.filter((item) => item.error).length;
    const succeeded = result.value.length - failed;
    if (failed === 0) {
      showToastMessage(`${succeeded} ${succeeded === 1 ? 'foto subida' : 'fotos subidas'} a Mis fotos`);
    } else if (succeeded === 0) {
      showToastMessage('No se ha podido subir ninguna foto', 'error');
    } else {
      showToastMessage(`${succeeded} de ${ids.length} fotos subidas — algunas no se han podido subir`, 'error');
    }
    if (succeeded > 0) posthog.capture('device_photos_bulk_uploaded', { count: succeeded });
  };

  // Devuelve los ids que quedan sin borrar (denegados por el usuario o fallidos) para que
  // DevicePhotoBatchActionsBar se los pase a onDone — un borrado parcial deja esos ids
  // seleccionados y visibles en vez de cerrar el modo selección, ver el refinamiento del issue.
  const handleBatchDelete = async (): Promise<string[]> => {
    const ids = Array.from(selectedIds);
    const result = await run(() => deleteDevicePhotos(ids), {
      errorMessage: 'No se han podido borrar las fotos de este dispositivo',
    });
    if (!result.ok) return ids;

    const { deletedIds } = result.value;
    const failedIds = ids.filter((id) => !deletedIds.includes(id));
    if (failedIds.length === 0) {
      showToastMessage(`${ids.length} ${ids.length === 1 ? 'foto borrada' : 'fotos borradas'} de este dispositivo`);
    } else if (deletedIds.length === 0) {
      showToastMessage('No se ha podido borrar ninguna foto de este dispositivo', 'error');
    } else {
      showToastMessage(`${deletedIds.length} de ${ids.length} fotos borradas — algunas no se han podido borrar`, 'error');
    }
    if (deletedIds.length > 0) posthog.capture('device_photos_bulk_deleted', { count: deletedIds.length });
    return failedIds;
  };

  return (
    <DevicePhotoBatchActionsBar
      active={active}
      selectedCount={selectedIds.size}
      onBatchUpload={handleBatchUpload}
      onBatchDelete={handleBatchDelete}
      onDone={onDone}
    />
  );
}
