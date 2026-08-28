import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BatchPhotoActionsBar } from '@/features/photos/components/BatchPhotoActionsBar';
import { usePersonasStore } from '@/store/usePersonasStore';
import { deletePhotosBatch, movePhotos } from '@/features/photos/useCases';
import { addTaggedPersonasBatch, changePhotoDateBatch, clearPhotoDateBatch, createChapter } from '@/features/chapters/useCases';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { Chapter, Photo, PhotoDate } from '@/types';
import { usePostHog } from 'posthog-js/react';

interface BatchPhotoActionsContainerProps {
  active: boolean;
  baulId: string;
  /** null = fotos sueltas virtual chapter — mirrors ChapterRoute's apiChapterId discriminator. */
  chapterId: string | null;
  photos: Photo[];
  selectedIds: Set<string>;
  moveableChapters: Chapter[];
  onDone: () => void;
  /** false for the baúl-wide "Fotos" tab (BaulRoute) with its "Todas" filter active: a single
   * selection there can span several chapters at once, so there's neither one source chapter
   * for "mover a otro capítulo" nor a clear "crear capítulo desde selección" (it would move
   * photos already spread across different origins). With "Sin capítulo" active, or from a
   * real chapter/upload batch, every selected photo shares the same (lack of) origin, so this
   * defaults to true. See issue #57's refinement. */
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
  const posthog = usePostHog();

  const handleBatchMove = async (
    photoIds: string[],
    targetChapterId: string,
    onItemSettled?: (result: { photoId: string; error?: string }) => void
  ) => {
    const result = await run(() => movePhotos(baulId, chapterId, photoIds, targetChapterId, onItemSettled), {
      successMessage: `${photoIds.length} ${photoIds.length === 1 ? 'foto movida' : 'fotos movidas'}`,
      errorMessage: 'Algunas fotos no se pudieron mover',
    });
    if (result.ok) {
      posthog.capture('photos_batch_moved', { photo_count: photoIds.length });
      navigate(`/baules/${baulId}/capitulos/${targetChapterId}`);
    }
  };

  // Rama "Nuevo capítulo …" inline de MoveModal (issue #59): crea el capítulo y mueve la
  // selección a él como 2 peticiones secuenciales, igual que handleBatchCreateChapter — pero
  // reportando progreso ítem a ítem como handleBatchMove, ya que se dispara desde el mismo
  // MoveModal de "Mover" en vez de la acción independiente "Crear nuevo capítulo".
  const handleBatchMoveToNewChapter = async (
    photoIds: string[],
    name: string,
    onItemSettled?: (result: { photoId: string; error?: string }) => void
  ) => {
    const result = await run(
      async () => {
        const newChapter = await createChapter(baulId, name);
        await movePhotos(baulId, chapterId, photoIds, newChapter.id, onItemSettled);
        return newChapter;
      },
      {
        successMessage: `${photoIds.length} ${photoIds.length === 1 ? 'foto movida' : 'fotos movidas'}`,
        errorMessage: 'Error al mover las fotos',
      }
    );
    if (result.ok) {
      posthog.capture('chapter_created', { source: 'photos_batch_move' });
      posthog.capture('photos_batch_moved', { photo_count: photoIds.length });
      navigate(`/baules/${baulId}/capitulos/${result.value.id}`);
    }
  };

  const handleBatchChangeDate = async (photoIds: string[], date: PhotoDate): Promise<boolean> => {
    const result = await run(() => changePhotoDateBatch(baulId, photoIds, date), {
      successMessage: `Fecha actualizada en ${photoIds.length} ${photoIds.length === 1 ? 'foto' : 'fotos'}`,
      errorMessage: 'Error al cambiar la fecha',
    });
    if (result.ok) posthog.capture('photos_batch_date_changed', { photo_count: photoIds.length, action: 'set' });
    return result.ok;
  };

  const handleBatchClearDate = async (photoIds: string[]): Promise<boolean> => {
    const result = await run(() => clearPhotoDateBatch(baulId, photoIds), {
      successMessage: `Fecha borrada en ${photoIds.length} ${photoIds.length === 1 ? 'foto' : 'fotos'}`,
      errorMessage: 'Error al borrar la fecha',
    });
    if (result.ok) posthog.capture('photos_batch_date_changed', { photo_count: photoIds.length, action: 'clear' });
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
    if (result.ok) {
      posthog.capture('chapter_created', { source: 'photos_batch_selection' });
      navigate(`/baules/${baulId}/capitulos/${result.value.id}`);
    }
    return result.ok;
  };

  const handleBatchTagPersonas = async (photoIds: string[], personaIds: string[]): Promise<boolean> => {
    const result = await run(() => addTaggedPersonasBatch(baulId, photoIds, personaIds), {
      successMessage: `${photoIds.length} ${photoIds.length === 1 ? 'foto etiquetada' : 'fotos etiquetadas'}`,
      errorMessage: 'Error al etiquetar las fotos',
    });
    if (result.ok) posthog.capture('photos_batch_tagged', { photo_count: photoIds.length });
    return result.ok;
  };

  const handleBatchDelete = async (photoIds: string[], reason?: string): Promise<boolean> => {
    const result = await run(() => deletePhotosBatch(baulId, photoIds, reason), {
      successMessage: `${photoIds.length} ${photoIds.length === 1 ? 'foto borrada' : 'fotos borradas'}`,
      errorMessage: 'Error al borrar las fotos',
    });
    if (result.ok) posthog.capture('photos_batch_deleted', { photo_count: photoIds.length });
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
      onBatchMoveToNewChapter={allowMoveActions ? handleBatchMoveToNewChapter : undefined}
      onBatchChangeDate={handleBatchChangeDate}
      onBatchClearDate={handleBatchClearDate}
      onBatchCreateChapter={allowMoveActions && chapterId === null ? handleBatchCreateChapter : undefined}
      onBatchTagPersonas={handleBatchTagPersonas}
      onBatchDelete={handleBatchDelete}
      onDone={onDone}
    />
  );
}
