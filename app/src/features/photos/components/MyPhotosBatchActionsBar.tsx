import React, { useState } from 'react';
import { FolderInput, Trash2 } from 'lucide-react';
import { ConfirmActionModal } from '@/design-system/patterns/forms/ConfirmActionModal';
import { AddToBaulModal } from '@/features/photos/components/AddToBaulModal';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { Baul } from '@/types';
import { ActionBarButton } from '@/design-system/components/actions/ActionBarButton';

interface MyPhotosBatchActionsBarProps {
  active: boolean;
  selectedCount: number;
  baules: Baul[];
  onBatchRemove: (reason?: string) => Promise<void>;
  onBatchAddToBaul: (targetBaulId: string) => Promise<void>;
  onDone: () => void;
}

// Barra de acciones en lote de la selección múltiple de "Mis fotos" (Slice 5, docs/.backlog
// issue #62) — mismo patrón que BatchPhotoActionsBar (icono + modal de confirmación por
// acción), pero con solo dos acciones: "Quitar de Mis fotos" (solo afecta a la relación
// UserPhotoAsset del usuario actual) y "Añadir a un baúl" (reutiliza AddToBaulModal).
export function MyPhotosBatchActionsBar({
  active, selectedCount, baules, onBatchRemove, onBatchAddToBaul, onDone,
}: MyPhotosBatchActionsBarProps) {
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showAddToBaulModal, setShowAddToBaulModal] = useState(false);
  const [addToBaulTargetId, setAddToBaulTargetId] = useState('');
  const [isAddingToBaul, setIsAddingToBaul] = useState(false);

  const plural = selectedCount === 1 ? 'foto' : 'fotos';

  const handleRemoveConfirm = async () => {
    setIsRemoving(true);
    await onBatchRemove();
    setIsRemoving(false);
    setShowRemoveModal(false);
    onDone();
  };

  const handleAddToBaulConfirm = async () => {
    if (!addToBaulTargetId) return;
    setIsAddingToBaul(true);
    await onBatchAddToBaul(addToBaulTargetId);
    setIsAddingToBaul(false);
    setShowAddToBaulModal(false);
    setAddToBaulTargetId('');
    onDone();
  };

  return (
    <>
      {active && selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30 pb-safe">
          <PageContainer className="py-3 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 w-max">
              {baules.length > 0 && (
                <ActionBarButton onClick={() => setShowAddToBaulModal(true)} icon={<FolderInput aria-hidden />}>
                  Añadir a un baúl
                </ActionBarButton>
              )}
              <ActionBarButton
                onClick={() => setShowRemoveModal(true)}
                icon={<Trash2 aria-hidden />}
                className="border-destructive/30 text-destructive [&_span]:text-destructive"
              >
                {`Quitar ${selectedCount} ${plural}`}
              </ActionBarButton>
            </div>
          </PageContainer>
        </div>
      )}

      {showRemoveModal && (
        <ConfirmActionModal
          title={`Quitar ${selectedCount} ${plural} de Mis fotos`}
          tone="plain"
          description={`Seguirán apareciendo en los baúles donde estén compartidas.`}
          confirmLabel="Sí, quitar"
          confirmVariant="primary"
          onCancel={() => setShowRemoveModal(false)}
          onConfirm={handleRemoveConfirm}
          isSubmitting={isRemoving}
        />
      )}

      {showAddToBaulModal && (
        <AddToBaulModal
          baules={baules}
          selectedId={addToBaulTargetId}
          onSelect={setAddToBaulTargetId}
          onCancel={() => setShowAddToBaulModal(false)}
          onConfirm={handleAddToBaulConfirm}
          isSubmitting={isAddingToBaul}
        />
      )}
    </>
  );
}
