import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderInput } from 'lucide-react';
import { PhotoViewerContainer } from '@/features/photos/containers/PhotoViewerContainer';
import { MoveModal } from '@/features/photos/components/MoveModal';
import { PhotoViewerMenuItem } from '@/features/photos/components/PhotoViewerHeader';
import { Chapter, Photo } from '@/types';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { movePhotos } from '@/features/photos/useCases';

interface ChapterPhotoViewerContainerProps {
  photo: Photo;
  photos: Photo[];
  baulId: string;
  baulName: string;
  /** null = la foto no pertenece a ningún capítulo (fotos sueltas) — sigue siendo un scope
   * válido para mover. */
  apiChapterId: string | null;
  allChapters: Chapter[];
  currentChapter?: Chapter;
  onClose: () => void;
  onPhotoChange: (photo: Photo) => void;
}

// Envuelve el PhotoViewerContainer universal añadiendo la única acción que sí necesita saber
// "en qué capítulo estoy": mover a otro capítulo. Se inyecta como extraMenuItems — ver
// usePhotoViewerActions.buildMenuItems para la garantía de que las acciones destructivas
// siguen yendo siempre al final. Navega ella misma tras un movimiento con éxito: solo necesita
// baulId + el id del capítulo destino, ambos ya conocidos, así que no hace falta que la Route
// se lo inyecte (ver docs/architecture/frontend.md, regla de navegación de containers/).
export function ChapterPhotoViewerContainer({
  photo, photos, baulId, baulName, apiChapterId, allChapters, currentChapter, onClose, onPhotoChange,
}: ChapterPhotoViewerContainerProps) {
  const navigate = useNavigate();
  const { run } = useAsyncAction();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);

  const moveableChapters = allChapters.filter((chapter) => chapter.id !== currentChapter?.id);

  const handleMoveSubmit = async () => {
    if (!moveTargetId) return;
    const targetChapterId = moveTargetId;
    setIsSubmittingMove(true);
    const result = await run(() => movePhotos(baulId, apiChapterId, [photo.id], targetChapterId), {
      successMessage: 'Foto movida',
      errorMessage: 'Error al mover la foto',
    });
    setIsSubmittingMove(false);
    if (result.ok) {
      setShowMoveModal(false);
      setMoveTargetId('');
      navigate(`/baules/${baulId}/capitulos/${targetChapterId}`, { replace: true });
    }
  };

  const extraMenuItems: PhotoViewerMenuItem[] = [];
  if (moveableChapters.length > 0) {
    extraMenuItems.push({
      key: 'move',
      label: 'Mover a otro capítulo',
      icon: FolderInput,
      onSelect: () => setShowMoveModal(true),
    });
  }

  return (
    <>
      <PhotoViewerContainer
        photo={photo}
        photos={photos}
        baulId={baulId}
        baulName={baulName}
        onClose={onClose}
        onPhotoChange={onPhotoChange}
        extraMenuItems={extraMenuItems}
      />

      {showMoveModal && (
        <MoveModal
          title="Mover a otro capítulo"
          chapters={moveableChapters}
          selectedId={moveTargetId}
          onSelect={setMoveTargetId}
          onCancel={() => setShowMoveModal(false)}
          onConfirm={handleMoveSubmit}
          isSubmitting={isSubmittingMove}
        />
      )}
    </>
  );
}
