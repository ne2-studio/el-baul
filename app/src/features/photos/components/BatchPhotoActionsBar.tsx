import React, { useState } from 'react';
import { Calendar, FolderInput, Plus, Tag } from 'lucide-react';
import { EditInfoModal } from '@/design-system/patterns/forms/EditInfoModal';
import { MoveModal } from '@/features/photos/components/MoveModal';
import { DateModal } from '@/design-system/patterns/forms/DateModal';
import { TagPersonasModal } from '@/features/photos/components/TagPersonasModal';
import { BatchOperationProgress, BatchOperationItem } from '@/design-system/components/feedback/BatchOperationProgress';
import { PageContainer } from '@/design-system/layouts/PageContainer';
import { Chapter, Photo, PhotoDate, Persona } from '@/types';
import { ActionBarButton } from '@/design-system/components/actions/ActionBarButton';

interface BatchPhotoActionsBarProps {
  active: boolean;
  photos: Photo[];
  selectedIds: Set<string>;
  moveableChapters: Chapter[];
  personas?: Persona[];
  onBatchMove?: (
    photoIds: string[],
    targetChapterId: string,
    onItemSettled?: (result: { photoId: string; error?: string }) => void
  ) => Promise<void>;
  onBatchChangeDate?: (photoIds: string[], date: PhotoDate) => Promise<boolean>;
  onBatchCreateChapter?: (photoIds: string[], name: string) => Promise<boolean>;
  onBatchTagPersonas?: (photoIds: string[], personaIds: string[]) => Promise<boolean>;
  onDone: () => void;
}

// Barra de acciones en lote (mover / cambiar fecha / crear capítulo / etiquetar personas) y
// sus modales, para el modo de selección múltiple de PhotosView. `active` refleja el modo de
// selección del padre; se mantiene como prop en vez de desmontar el componente para
// no perder el patrón de gating explícito que tenía PhotosView antes de la extracción.
export function BatchPhotoActionsBar({
  active, photos, selectedIds, moveableChapters, personas = [], onBatchMove, onBatchChangeDate, onBatchCreateChapter,
  onBatchTagPersonas, onDone,
}: BatchPhotoActionsBarProps) {
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [moveItems, setMoveItems] = useState<BatchOperationItem[] | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [isDateSubmitting, setIsDateSubmitting] = useState(false);
  const [showCreateChapterModal, setShowCreateChapterModal] = useState(false);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagPersonaIds, setTagPersonaIds] = useState<string[]>([]);
  const [isTaggingSubmitting, setIsTaggingSubmitting] = useState(false);

  const handleMoveSubmit = async () => {
    if (!moveTargetId || !onBatchMove) return;
    const targetChapterId = moveTargetId;
    const ids = Array.from(selectedIds);
    setShowMoveModal(false);
    setMoveTargetId('');
    setMoveItems(
      ids.map((id) => ({
        id,
        thumbnailUrl: photos.find((p) => p.id === id)?.thumbnailUrl ?? '',
        status: 'pending' as const,
      }))
    );

    await onBatchMove(ids, targetChapterId, (result) => {
      setMoveItems((prev) =>
        prev?.map((item) =>
          item.id === result.photoId ? { ...item, status: result.error ? ('error' as const) : ('success' as const) } : item
        ) ?? prev
      );
    });

    setMoveItems(null);
    onDone();
  };

  const handleDateSubmit = async (date: PhotoDate) => {
    if (!onBatchChangeDate) return;
    setIsDateSubmitting(true);
    const ok = await onBatchChangeDate(Array.from(selectedIds), date);
    setIsDateSubmitting(false);
    if (ok) {
      setShowDateModal(false);
      onDone();
    }
  };

  const handleCreateChapterSave = async (name: string) => {
    if (!onBatchCreateChapter) return;
    setIsCreatingChapter(true);
    const ok = await onBatchCreateChapter(Array.from(selectedIds), name);
    setIsCreatingChapter(false);
    if (ok) {
      setShowCreateChapterModal(false);
      onDone();
    }
  };

  const toggleTagPersona = (personaId: string) => {
    setTagPersonaIds((current) =>
      current.includes(personaId) ? current.filter((id) => id !== personaId) : [...current, personaId]);
  };

  const handleTagSubmit = async () => {
    if (!onBatchTagPersonas) return;
    setIsTaggingSubmitting(true);
    const ok = await onBatchTagPersonas(Array.from(selectedIds), tagPersonaIds);
    setIsTaggingSubmitting(false);
    if (ok) {
      setShowTagModal(false);
      setTagPersonaIds([]);
      onDone();
    }
  };

  return (
    <>
      {active && selectedIds.size > 0 && (onBatchChangeDate || moveableChapters.length > 0 || onBatchCreateChapter || onBatchTagPersonas) && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30 pb-safe">
          {/* w-max en el contenedor interno evita que los botones se compriman: con muchas
              acciones el PageContainer hace scroll lateral en vez de aplastar la barra. */}
          <PageContainer className="py-3 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 w-max">
              {onBatchChangeDate && (
                <ActionBarButton
                  onClick={() => setShowDateModal(true)}
                  icon={<Calendar aria-hidden />}
                >
                  Cambiar fecha
                </ActionBarButton>
              )}
              {moveableChapters.length > 0 && (
                <ActionBarButton
                  onClick={() => setShowMoveModal(true)}
                  icon={<FolderInput aria-hidden />}
                >
                  Mover
                </ActionBarButton>
              )}
              {onBatchCreateChapter && (
                <ActionBarButton
                  onClick={() => setShowCreateChapterModal(true)}
                  icon={<Plus aria-hidden />}
                >
                  Crear nuevo capítulo
                </ActionBarButton>
              )}
              {onBatchTagPersonas && (
                <ActionBarButton
                  onClick={() => setShowTagModal(true)}
                  icon={<Tag aria-hidden />}
                >
                  Etiquetar personas
                </ActionBarButton>
              )}
            </div>
          </PageContainer>
        </div>
      )}

      {showDateModal && (
        <DateModal
          title={`Cambiar fecha · ${selectedIds.size} ${selectedIds.size === 1 ? 'foto' : 'fotos'}`}
          onCancel={() => setShowDateModal(false)}
          onConfirm={handleDateSubmit}
          isSubmitting={isDateSubmitting}
        />
      )}

      {showMoveModal && (
        <MoveModal
          title={`Mover ${selectedIds.size} ${selectedIds.size === 1 ? 'foto' : 'fotos'}`}
          chapters={moveableChapters}
          selectedId={moveTargetId}
          onSelect={setMoveTargetId}
          onCancel={() => setShowMoveModal(false)}
          onConfirm={handleMoveSubmit}
        />
      )}

      {/* Progreso ítem a ítem mientras se mueve el lote (una petición por foto) */}
      {moveItems && (
        <BatchOperationProgress title="Moviendo fotos..." items={moveItems} />
      )}

      {showCreateChapterModal && (
        <EditInfoModal
          title="Nuevo capítulo"
          initialName=""
          namePlaceholder="Nombre del capítulo"
          onCancel={() => setShowCreateChapterModal(false)}
          onSave={handleCreateChapterSave}
          isSubmitting={isCreatingChapter}
        />
      )}

      {showTagModal && (
        <TagPersonasModal
          title={`Etiquetar · ${selectedIds.size} ${selectedIds.size === 1 ? 'foto' : 'fotos'}`}
          personas={personas}
          selectedIds={tagPersonaIds}
          onToggle={toggleTagPersona}
          onCancel={() => { setShowTagModal(false); setTagPersonaIds([]); }}
          onConfirm={handleTagSubmit}
          isSubmitting={isTaggingSubmitting}
        />
      )}
    </>
  );
}
