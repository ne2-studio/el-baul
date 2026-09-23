import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ConfirmActionModal } from '@/design-system/patterns/forms/ConfirmActionModal';
import { PhotoViewerMenuItem } from '@/features/photos/components/PhotoViewerHeader';
import { DevicePhoto } from '@/features/photos/native/devicePhotos';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { deleteDevicePhotos } from '@/features/photos/useCases';

interface UseDevicePhotoViewerActionsOptions {
  photo: DevicePhoto;
  /** Se invoca una vez que la foto ya se ha borrado de verdad de useDevicePhotosStore — para
   * cerrar el visor, mismo patrón onRemoved/onDeleted que usePhotoViewerActions y
   * useMyPhotoViewerActions. */
  onDeleted: () => void;
}

interface UseDevicePhotoViewerActionsResult {
  menuItems: PhotoViewerMenuItem[];
  modals: React.ReactNode;
}

// "En este dispositivo"'s own menú "···" — la contraparte de useMyPhotoViewerActions, pero para
// una fila de MediaStore en lugar de un PhotoAsset. "Borrar de este dispositivo" (GitHub issue
// #86) es la única acción: un borrado local y permanente del dispositivo, totalmente
// independiente de si esta foto se ha subido alguna vez a El Baúl (ver issue #87) — por eso
// nunca toca api.*, useMyPhotosStore ni usePhotosStore, solo deleteDevicePhotos. Sigue el mismo
// patrón de doble confirmación que "Quitar de Mis fotos": primero el propio ConfirmActionModal
// de la app, y luego deleteDevicePhotos dispara el diálogo de consentimiento del propio Android
// como segundo paso, inevitable y fuera de nuestro control.
export function useDevicePhotoViewerActions({ photo, onDeleted }: UseDevicePhotoViewerActionsOptions): UseDevicePhotoViewerActionsResult {
  const { run } = useAsyncAction();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    const result = await run(
      async () => {
        const deleteResult = await deleteDevicePhotos([photo.id]);
        // deletePhotos nunca lanza cuando el usuario simplemente cancela el diálogo del sistema
        // (ver DeletePhotosResult) — se convierte aquí en un error para que run() muestre el
        // mismo toast/registro que cualquier otro fallo, en vez de dejar la foto "a medias" sin
        // ningún aviso.
        if (!deleteResult.deletedIds.includes(photo.id)) {
          throw new Error('El sistema no ha confirmado el borrado de esta foto');
        }
      },
      {
        successMessage: 'Foto borrada de este dispositivo',
        errorMessage: 'No se ha podido borrar la foto de este dispositivo',
      }
    );
    setIsDeleting(false);
    if (result.ok) {
      setShowDeleteModal(false);
      onDeleted();
    }
  };

  const menuItems: PhotoViewerMenuItem[] = [
    { key: 'delete', label: 'Borrar de este dispositivo', icon: Trash2, onSelect: () => setShowDeleteModal(true), variant: 'destructive' as const },
  ];

  const modals = (
    <>
      {showDeleteModal && (
        <ConfirmActionModal
          title="Borrar esta foto de este dispositivo"
          description="Se eliminará permanentemente del almacenamiento de tu móvil. No afecta a si esta foto está subida a El Baúl."
          confirmLabel="Sí, borrar"
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          isSubmitting={isDeleting}
        />
      )}
    </>
  );

  return { menuItems, modals };
}
