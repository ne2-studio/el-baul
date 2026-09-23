import React, { useMemo, useState } from 'react';
import { usePostHog } from 'posthog-js/react';
import { FolderInput, Trash2 } from 'lucide-react';
import { AddToBaulModal } from '@/features/photos/components/AddToBaulModal';
import { ConfirmActionModal } from '@/design-system/patterns/forms/ConfirmActionModal';
import { PhotoViewerMenuItem } from '@/features/photos/components/PhotoViewerHeader';
import { PhotoAsset } from '@/types';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulesStore } from '@/store/useBaulesStore';
import { useMyPhotosStore } from '@/store/useMyPhotosStore';
import { addPhotoAssetToBaul } from '@/features/photos/useCases/sharing';
import { removeFromMyPhotos } from '@/features/photos/useCases/personalCollection';

interface UseMyPhotoViewerActionsOptions {
  photo: PhotoAsset;
  /** Se invoca cuando el asset deja de estar en la galería cargada — tras quitarlo de Mis fotos,
   * o tras añadirlo a un baúl estando en "Sin compartir" (GitHub issue #80: deja de estar sin
   * compartir, así que useMyPhotosStore lo descarta) — para cerrar el visor, mismo patrón que
   * onDeleted en usePhotoViewerActions. */
  onRemoved: () => void;
}

interface UseMyPhotoViewerActionsResult {
  menuItems: PhotoViewerMenuItem[];
  modals: React.ReactNode;
  // Exposed separately from menuItems so the "Todavía no aparece en ningún baúl" empty state
  // (Slice 3, docs/.backlog issue #62) can trigger the same picker as the "···" menu — undefined
  // when there's genuinely nowhere left to add this asset to.
  openAddToBaulModal?: () => void;
}

// Mis fotos' own (much smaller) counterpart to usePhotoViewerActions — asset-scoped instead of
// baúl-scoped. "Añadir a otro baúl" (Slice 2) and "Quitar de Mis fotos" (Slice 5, docs/.backlog
// issue #62) are the only two actions Mis fotos exposes. No tagging, recuerdos, date editing or
// baúl-photo delete here — those stay baúl-scoped, see MyPhotoViewerContainer's own comment.
export function useMyPhotoViewerActions({ photo, onRemoved }: UseMyPhotoViewerActionsOptions): UseMyPhotoViewerActionsResult {
  const { run } = useAsyncAction();
  const posthog = usePostHog();
  // Baúles a los que este usuario puede añadir contenido, excluyendo aquellos en los que este
  // PhotoAsset ya aparece — el backend es quien de verdad autoriza cada baúl al confirmar (ver
  // PhotoManager.AddAssetToBaulAsync), esta lista solo evita ofrecer opciones sin sentido en el
  // picker. useMemo evita que Zustand vea una referencia nueva en cada render.
  const allBaules = useBaulesStore((state) => state.baules);
  const otherBaules = useMemo(
    () => allBaules.filter((b) => !photo.baules.some((appearance) => appearance.baulId === b.id)),
    [allBaules, photo.baules]
  );

  const [showAddToBaulModal, setShowAddToBaulModal] = useState(false);
  const [selectedTargetBaulId, setSelectedTargetBaulId] = useState('');
  const [isAddingToBaul, setIsAddingToBaul] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const openAddToBaulModal = () => {
    setSelectedTargetBaulId('');
    setShowAddToBaulModal(true);
  };

  const handleAddToBaulConfirm = async () => {
    if (!selectedTargetBaulId) return;
    setIsAddingToBaul(true);
    const result = await run(() => addPhotoAssetToBaul(photo.id, selectedTargetBaulId), {
      successMessage: 'Foto añadida al baúl',
      errorMessage: 'Error al añadir la foto al baúl',
    });
    setIsAddingToBaul(false);
    if (result.ok) {
      posthog.capture('photo_added_to_baul', { source: 'mis_fotos' });
      setShowAddToBaulModal(false);
      if (useMyPhotosStore.getState().filter === 'sin-compartir') {
        // La foto acaba de dejar de estar "sin compartir": addPhotoAssetToBaul ya la sacó de
        // useMyPhotosStore (GitHub issue #80), así que el visor no tiene nada que seguir
        // mostrando — cierra/navega fuera, igual que "Quitar de Mis fotos".
        onRemoved();
      }
      // En "Todas" se queda abierto: el usuario puede querer añadir esta misma foto a otro baúl
      // más (ver punto 7 del ticket) — "Aparece en" ya se actualizó vía el store.
    }
  };

  const handleRemoveConfirm = async () => {
    setIsRemoving(true);
    const result = await run(() => removeFromMyPhotos(photo.id), {
      successMessage: 'Foto quitada de Mis fotos',
      errorMessage: 'Error al quitar la foto de Mis fotos',
    });
    setIsRemoving(false);
    if (result.ok) {
      posthog.capture('personal_photo_removed');
      setShowRemoveModal(false);
      onRemoved();
    }
  };

  const menuItems: PhotoViewerMenuItem[] = [
    ...(otherBaules.length > 0
      ? [{ key: 'add-to-baul', label: 'Añadir a otro baúl', icon: FolderInput, onSelect: openAddToBaulModal }]
      : []),
    { key: 'remove', label: 'Quitar de Mis fotos', icon: Trash2, onSelect: () => setShowRemoveModal(true), variant: 'destructive' as const },
  ];

  const modals = (
    <>
      {showAddToBaulModal && (
        <AddToBaulModal
          baules={otherBaules}
          selectedId={selectedTargetBaulId}
          onSelect={setSelectedTargetBaulId}
          onCancel={() => setShowAddToBaulModal(false)}
          onConfirm={handleAddToBaulConfirm}
          isSubmitting={isAddingToBaul}
        />
      )}

      {showRemoveModal && (
        <ConfirmActionModal
          title="Quitar esta foto de Mis fotos"
          tone="plain"
          description="Seguirá apareciendo en los baúles donde esté compartida."
          confirmLabel="Sí, quitar"
          confirmVariant="primary"
          onCancel={() => setShowRemoveModal(false)}
          onConfirm={handleRemoveConfirm}
          isSubmitting={isRemoving}
        />
      )}
    </>
  );

  return { menuItems, modals, openAddToBaulModal: otherBaules.length > 0 ? openAddToBaulModal : undefined };
}
