import React, { useState } from 'react';
import { usePostHog } from 'posthog-js/react';
import { Trash2, Upload } from 'lucide-react';
import { ConfirmActionModal } from '@/design-system/patterns/forms/ConfirmActionModal';
import { PhotoViewerMenuItem } from '@/features/photos/components/PhotoViewerHeader';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useUIStore } from '@/store/uiStore';
import { DevicePhoto } from '@/features/photos/native/devicePhotos';
import { deleteDevicePhotos, uploadDevicePhotosToMyPhotos } from '@/features/photos/useCases';

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

const UPLOAD_ACTION_KEY = 'upload-device-photo';

// "En este dispositivo"'s own menú "···" — la contraparte de useMyPhotoViewerActions, pero para
// una fila de MediaStore en lugar de un PhotoAsset. Expone dos acciones, independientes entre sí:
//
// - "Subir foto" (GitHub issue #87) guarda una copia en Mis fotos sin tocar el propio
//   dispositivo. Delega en uploadDevicePhotosToMyPhotos, mantenido array-first (un array de un
//   solo elemento aquí) para que la futura subida múltiple de #88 pueda llamar al mismo caso de
//   uso sin cambios.
// - "Borrar de este dispositivo" (GitHub issue #86) es un borrado local y permanente del
//   dispositivo, totalmente independiente de si esta foto se ha subido alguna vez a El Baúl —
//   por eso nunca toca api.*, useMyPhotosStore ni usePhotosStore, solo deleteDevicePhotos. Sigue
//   el mismo patrón de doble confirmación que "Quitar de Mis fotos": primero el propio
//   ConfirmActionModal de la app, y luego deleteDevicePhotos dispara el diálogo de consentimiento
//   del propio Android como segundo paso, inevitable y fuera de nuestro control.
//
// Ver también DevicePhotoViewerContainer's boundary note para por qué ninguna otra acción (fecha,
// recuerdos…) tiene cabida aquí.
export function useDevicePhotoViewerActions({ photo, onDeleted }: UseDevicePhotoViewerActionsOptions): UseDevicePhotoViewerActionsResult {
  const { run, isPending } = useAsyncAction();
  const posthog = usePostHog();
  const showToastMessage = useUIStore((state) => state.showToastMessage);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpload = async () => {
    const result = await run(() => uploadDevicePhotosToMyPhotos([photo]), {
      key: UPLOAD_ACTION_KEY,
      errorMessage: 'Error al subir la foto',
    });
    if (!result.ok) return;

    // uploadDevicePhotosToMyPhotos never rejects — a per-photo failure (unreadable original,
    // failed upload request) comes back as an UploadItemResult.error instead, same convention
    // as every other upload use case (see uploads.ts).
    const [uploadResult] = result.value;
    if (uploadResult?.error) {
      showToastMessage(uploadResult.error, 'error');
      return;
    }

    posthog.capture('device_photo_uploaded');
    showToastMessage('Foto subida a Mis fotos');
  };

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

  // Destructive items go last (same convention as useMyPhotoViewerActions).
  const menuItems: PhotoViewerMenuItem[] = [
    {
      key: 'upload',
      label: 'Subir foto',
      icon: Upload,
      onSelect: () => {
        void handleUpload();
      },
      disabled: isPending(UPLOAD_ACTION_KEY),
    },
    {
      key: 'delete',
      label: 'Borrar de este dispositivo',
      icon: Trash2,
      onSelect: () => setShowDeleteModal(true),
      variant: 'destructive' as const,
    },
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
