import React from 'react';
import { usePostHog } from 'posthog-js/react';
import { MyPhotosBatchActionsBar } from '@/features/photos/components/MyPhotosBatchActionsBar';
import { useBaulesStore } from '@/store/useBaulesStore';
import { removePhotosFromMyPhotos, addPhotoAssetsToBaulBatch } from '@/features/photos/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';

interface MyPhotosBatchActionsContainerProps {
  active: boolean;
  selectedIds: Set<string>;
  onDone: () => void;
}

// Self-sufficient (docs/architecture/frontend.md's containers/ rule): la barra de acciones en
// lote de "Mis fotos" (Slice 5, docs/.backlog issue #62) — mismo espíritu que
// BatchPhotoActionsContainer, pero solo con las dos acciones que tienen sentido sobre PhotoAsset
// (quitar de Mis fotos / añadir a un baúl), cada una resuelta en una única petición al backend.
export function MyPhotosBatchActionsContainer({ active, selectedIds, onDone }: MyPhotosBatchActionsContainerProps) {
  const { run } = useAsyncAction();
  const posthog = usePostHog();
  const baules = useBaulesStore((state) => state.baules);

  const handleBatchRemove = async () => {
    const ids = Array.from(selectedIds);
    const result = await run(() => removePhotosFromMyPhotos(ids), {
      successMessage: `${ids.length} ${ids.length === 1 ? 'foto quitada' : 'fotos quitadas'} de Mis fotos`,
      errorMessage: 'Error al quitar las fotos de Mis fotos',
    });
    if (result.ok) posthog.capture('personal_photos_bulk_removed', { count: ids.length });
  };

  const handleBatchAddToBaul = async (targetBaulId: string) => {
    const ids = Array.from(selectedIds);
    const result = await run(() => addPhotoAssetsToBaulBatch(ids, targetBaulId), {
      successMessage: `${ids.length} ${ids.length === 1 ? 'foto añadida' : 'fotos añadidas'} al baúl`,
      errorMessage: 'Algunas fotos no se pudieron añadir',
    });
    if (result.ok) posthog.capture('personal_photos_added_to_baul', { count: ids.length });
  };

  return (
    <MyPhotosBatchActionsBar
      active={active}
      selectedCount={selectedIds.size}
      baules={baules}
      onBatchRemove={handleBatchRemove}
      onBatchAddToBaul={handleBatchAddToBaul}
      onDone={onDone}
    />
  );
}
