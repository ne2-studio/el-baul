import React, { useMemo, useState } from 'react';
import { FolderInput } from 'lucide-react';
import { AddToBaulModal } from '@/features/photos/components/AddToBaulModal';
import { PhotoViewerMenuItem } from '@/features/photos/components/PhotoViewerHeader';
import { PhotoAsset } from '@/types';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useBaulesStore } from '@/store/useBaulesStore';
import { addPhotoAssetToBaul } from '@/features/photos/useCases/sharing';
import { usePostHog } from 'posthog-js/react';

interface UseMyPhotoViewerActionsOptions {
  photo: PhotoAsset;
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
// baúl-scoped: "Añadir a otro baúl" is the only action Mis fotos exposes this slice (docs/.backlog
// issue #62, Slice 2 — Mis fotos wiring). No tagging, recuerdos, date editing or delete here,
// same as before — see MyPhotoViewerContainer's own comment.
export function useMyPhotoViewerActions({ photo }: UseMyPhotoViewerActionsOptions): UseMyPhotoViewerActionsResult {
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
      // Cierra solo el modal, no el visor: el usuario puede querer añadir esta misma foto a
      // otro baúl más (ver punto 7 del ticket) — "Aparece en" ya se actualizó vía el store.
      setShowAddToBaulModal(false);
    }
  };

  const menuItems: PhotoViewerMenuItem[] = otherBaules.length > 0
    ? [{ key: 'add-to-baul', label: 'Añadir a otro baúl', icon: FolderInput, onSelect: openAddToBaulModal }]
    : [];

  const modals = showAddToBaulModal && (
    <AddToBaulModal
      baules={otherBaules}
      selectedId={selectedTargetBaulId}
      onSelect={setSelectedTargetBaulId}
      onCancel={() => setShowAddToBaulModal(false)}
      onConfirm={handleAddToBaulConfirm}
      isSubmitting={isAddingToBaul}
    />
  );

  return { menuItems, modals, openAddToBaulModal: otherBaules.length > 0 ? openAddToBaulModal : undefined };
}
