import React, { useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { ConfirmActionModal } from '@/design-system/patterns/forms/ConfirmActionModal';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { ActionBarButton } from '@/design-system/components/actions/ActionBarButton';

interface DevicePhotoBatchActionsBarProps {
  active: boolean;
  selectedCount: number;
  onBatchUpload: () => Promise<void>;
  /** Devuelve los ids que *no* se han podido borrar (denegados/fallidos) — a diferencia de
   * MyPhotosBatchActionsBar.onDone, que siempre sale del modo selección, aquí el borrado
   * parcial deja esos ids seleccionados (ver DevicePhotoBatchActionsContainer). */
  onBatchDelete: () => Promise<string[]>;
  /** remainingIds ausente o vacío = selección completa resuelta, sale del modo selección;
   * no vacío = borrado parcial, la ruta vuelve a seleccionar solo esos ids. */
  onDone: (remainingIds?: string[]) => void;
}

// Barra de acciones en lote de "En este dispositivo" (GitHub issue #88) — mismo patrón que
// MyPhotosBatchActionsBar (icono + ConfirmActionModal por acción), pero con las dos acciones que
// ya existían para una sola foto en el visor (useDevicePhotoViewerActions, issues #86/#87):
// "Subir fotos" y "Borrar de este dispositivo". Ambas pasan por su propio ConfirmActionModal en
// lote (a diferencia de "Subir foto" individual, que no pedía confirmación) — la subida en lote
// también dispara un fetch por foto y merece la misma pausa antes de lanzarla.
export function DevicePhotoBatchActionsBar({
  active, selectedCount, onBatchUpload, onBatchDelete, onDone,
}: DevicePhotoBatchActionsBarProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const plural = selectedCount === 1 ? 'foto' : 'fotos';

  const handleUploadConfirm = async () => {
    setIsUploading(true);
    await onBatchUpload();
    setIsUploading(false);
    setShowUploadModal(false);
    onDone();
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    const remainingIds = await onBatchDelete();
    setIsDeleting(false);
    setShowDeleteModal(false);
    onDone(remainingIds);
  };

  return (
    <>
      {active && selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30 pb-safe">
          <PageContainer className="py-3 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 w-max">
              <ActionBarButton onClick={() => setShowUploadModal(true)} icon={<Upload aria-hidden />}>
                {`Subir ${selectedCount} ${plural}`}
              </ActionBarButton>
              <ActionBarButton
                onClick={() => setShowDeleteModal(true)}
                icon={<Trash2 aria-hidden />}
                className="border-destructive/30 text-destructive [&_span]:text-destructive"
              >
                {`Borrar ${selectedCount} ${plural}`}
              </ActionBarButton>
            </div>
          </PageContainer>
        </div>
      )}

      {showUploadModal && (
        <ConfirmActionModal
          title={`Subir ${selectedCount} ${plural} a Mis fotos`}
          tone="plain"
          description="Se guardará una copia en Mis fotos. El dispositivo no se modifica."
          confirmLabel="Sí, subir"
          confirmVariant="primary"
          onCancel={() => setShowUploadModal(false)}
          onConfirm={handleUploadConfirm}
          isSubmitting={isUploading}
        />
      )}

      {showDeleteModal && (
        <ConfirmActionModal
          title={`Borrar ${selectedCount} ${plural} de este dispositivo`}
          description="Se eliminarán permanentemente del almacenamiento de tu móvil. No afecta a si están subidas a El Baúl."
          confirmLabel="Sí, borrar"
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          isSubmitting={isDeleting}
        />
      )}
    </>
  );
}
