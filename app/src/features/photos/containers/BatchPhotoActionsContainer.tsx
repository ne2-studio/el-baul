import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BatchPhotoActionsBar } from '@/features/photos/components/BatchPhotoActionsBar';
import { usePersonasStore } from '@/store/usePersonasStore';
import { deletePhotosBatch, movePhotos } from '@/features/photos/useCases';
import { addTaggedPersonasBatch, changePhotoDateBatch, clearPhotoDateBatch, createChapter } from '@/features/chapters/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { Chapter, Photo, PhotoDate } from '@/types';

interface BatchPhotoActionsContainerProps {
  active: boolean;
  baulId: string;
  /** null = fotos sueltas virtual chapter — mirrors ChapterRoute's apiChapterId discriminator. */
  chapterId: string | null;
  photos: Photo[];
  selectedIds: Set<string>;
  moveableChapters: Chapter[];
  onDone: () => void;
  /** false only for the baúl-wide "Fotos" tab (BaulRoute): a single selection there can span
   * several chapters plus fotos sueltas at once, so there's neither one source chapter for
   * "mover a otro capítulo" nor a clear "crear capítulo desde selección" (it would move
   * photos already spread across different origins) — v1 only offers fecha/etiquetar/borrar
   * for that tab. See issue #57's refinement. Defaults to true, i.e. every other caller
   * (chapter, fotos sueltas, upload batch) keeps today's behavior unchanged. */
  allowMoveActions?: boolean;
}

// Self-sufficient multi-select action bar: owns move/change-date/create-chapter/tag-personas
// end to end. Self-navigates after a successful move or chapter creation — both only need
// baulId + the result's id, nothing route-context-dependent — see
// docs/architecture/frontend.md's containers/ rule.
export function BatchPhotoActionsContainer({
  active, baulId, chapterId, photos, selectedIds, moveableChapters, onDone, allowMoveActions = true,
}: BatchPhotoActionsContainerProps) {
  const navigate = useNavigate();
  const { personas } = usePersonasStore();
  const { run } = useAsyncAction();

  const handleBatchMove = async (
    photoIds: string[],
    targetChapterId: string,
    onItemSettled?: (result: { photoId: string; error?: string }) => void
  ) => {
    const result = await run(() => movePhotos(baulId, chapterId, photoIds, targetChapterId, onItemSettled), {
      successMessage: `${photoIds.length} ${photoIds.length === 1 ? 'foto movida' : 'fotos movidas'}`,
      errorMessage: 'Algunas fotos no se pudieron mover',
    });
    if (result.ok) navigate(`/baules/${baulId}/capitulos/${targetChapterId}`);
  };

  const handleBatchChangeDate = async (photoIds: string[], date: PhotoDate): Promise<boolean> => {
    const result = await run(() => changePhotoDateBatch(baulId, photoIds, date), {
      successMessage: `Fecha actualizada en ${photoIds.length} ${photoIds.length === 1 ? 'foto' : 'fotos'}`,
      errorMessage: 'Error al cambiar la fecha',
    });
    return result.ok;
  };

  const handleBatchClearDate = async (photoIds: string[]): Promise<boolean> => {
    const result = await run(() => clearPhotoDateBatch(baulId, photoIds), {
      successMessage: `Fecha borrada en ${photoIds.length} ${photoIds.length === 1 ? 'foto' : 'fotos'}`,
      errorMessage: 'Error al borrar la fecha',
    });
    return result.ok;
  };

  const handleBatchCreateChapter = async (photoIds: string[], name: string): Promise<boolean> => {
    const result = await run(
      async () => {
        const newChapter = await createChapter(baulId, name);
        await movePhotos(baulId, null, photoIds, newChapter.id);
        return newChapter;
      },
      {
        successMessage: `Capítulo "${name}" creado`,
        errorMessage: 'Error al crear el capítulo',
      }
    );
    if (result.ok) navigate(`/baules/${baulId}/capitulos/${result.value.id}`);
    return result.ok;
  };

  const handleBatchTagPersonas = async (photoIds: string[], personaIds: string[]): Promise<boolean> => {
    const result = await run(() => addTaggedPersonasBatch(baulId, photoIds, personaIds), {
      successMessage: `${photoIds.length} ${photoIds.length === 1 ? 'foto etiquetada' : 'fotos etiquetadas'}`,
      errorMessage: 'Error al etiquetar las fotos',
    });
    return result.ok;
  };

  const handleBatchDelete = async (photoIds: string[], reason?: string): Promise<boolean> => {
    const result = await run(() => deletePhotosBatch(baulId, photoIds, reason), {
      successMessage: `${photoIds.length} ${photoIds.length === 1 ? 'foto borrada' : 'fotos borradas'}`,
      errorMessage: 'Error al borrar las fotos',
    });
    return result.ok;
  };

  return (
    <BatchPhotoActionsBar
      active={active}
      photos={photos}
      selectedIds={selectedIds}
      moveableChapters={moveableChapters}
      personas={personas[baulId] || []}
      onBatchMove={allowMoveActions ? handleBatchMove : undefined}
      onBatchChangeDate={handleBatchChangeDate}
      onBatchClearDate={handleBatchClearDate}
      onBatchCreateChapter={allowMoveActions && chapterId === null ? handleBatchCreateChapter : undefined}
      onBatchTagPersonas={handleBatchTagPersonas}
      onBatchDelete={handleBatchDelete}
      onDone={onDone}
    />
  );
}
