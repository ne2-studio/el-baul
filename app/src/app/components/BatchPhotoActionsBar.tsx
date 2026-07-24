import React, { useState } from 'react';
import { Calendar, FolderInput, Plus } from 'lucide-react';
import { EditInfoModal } from './EditInfoModal';
import { MoveModal } from './MoveModal';
import { DateModal } from './DateModal';
import { BatchOperationProgress, BatchOperationItem } from './BatchOperationProgress';
import { Chapter } from './ChaptersView';
import { Photo } from './PhotosView';
import { PhotoDate } from '@/types';

interface BatchPhotoActionsBarProps {
  active: boolean;
  photos: Photo[];
  selectedIds: Set<string>;
  moveableChapters: Chapter[];
  onBatchMove?: (
    photoIds: string[],
    targetChapterId: string,
    onItemSettled?: (result: { photoId: string; error?: string }) => void
  ) => Promise<void>;
  onBatchChangeDate?: (photoIds: string[], date: PhotoDate) => Promise<boolean>;
  onBatchCreateChapter?: (photoIds: string[], name: string) => Promise<boolean>;
  onDone: () => void;
}

// Barra de acciones en lote (mover / cambiar fecha / crear capítulo) y sus modales,
// para el modo de selección múltiple de PhotosView. `active` refleja el modo de
// selección del padre; se mantiene como prop en vez de desmontar el componente para
// no perder el patrón de gating explícito que tenía PhotosView antes de la extracción.
export function BatchPhotoActionsBar({
  active, photos, selectedIds, moveableChapters, onBatchMove, onBatchChangeDate, onBatchCreateChapter, onDone,
}: BatchPhotoActionsBarProps) {
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [moveItems, setMoveItems] = useState<BatchOperationItem[] | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [isDateSubmitting, setIsDateSubmitting] = useState(false);
  const [showCreateChapterModal, setShowCreateChapterModal] = useState(false);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);

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

  return (
    <>
      {active && selectedIds.size > 0 && (onBatchChangeDate || moveableChapters.length > 0 || onBatchCreateChapter) && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30">
          <div className="max-w-2xl mx-auto px-6 py-4 flex gap-3">
            {onBatchChangeDate && (
              <button
                onClick={() => setShowDateModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Cambiar fecha
              </button>
            )}
            {moveableChapters.length > 0 && (
              <button
                onClick={() => setShowMoveModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <FolderInput className="w-4 h-4 text-muted-foreground" />
                Mover
              </button>
            )}
            {onBatchCreateChapter && (
              <button
                onClick={() => setShowCreateChapterModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
                Crear nuevo capítulo
              </button>
            )}
          </div>
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
    </>
  );
}
