import React, { useState } from 'react';
import { FolderInput } from 'lucide-react';
import { PhotoViewerContainer } from '@/features/photos/containers/PhotoViewerContainer';
import { MoveModal } from '@/features/photos/components/MoveModal';
import { PhotoViewerMenuItem } from '@/features/photos/components/PhotoViewerHeader';
import { Chapter, Photo } from '@/types';
import { usePostHog } from 'posthog-js/react';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { movePhotos } from '@/features/photos/useCases';
import { createChapter } from '@/features/chapters/useCases';

interface CrossChapterPhotoViewerContainerProps {
  photo: Photo;
  photos: Photo[];
  baulId: string;
  baulName: string;
  allChapters: Chapter[];
  onClose: () => void;
  onPhotoChange: (photo: Photo) => void;
  /** Nombre del capítulo de la foto actual — forwardeado a PhotoViewerContainer, ver ahí. */
  chapterName?: string;
}

// Variante de ChapterPhotoViewerContainer para visores que cruzan capítulos libremente (el
// "Fotos" del baúl y las fotos de una persona) — a diferencia de aquel, no recibe un
// apiChapterId/currentChapter fijos desde la Route porque cada foto de la lista puede
// pertenecer a un capítulo distinto (o a ninguno): se resuelven aquí, foto a foto, a partir de
// photo.chapterId, el mismo campo que ya trae cualquier Photo. Por lo demás reusa el mismo
// MoveModal + movePhotos + createChapter que ChapterPhotoViewerContainer.
//
// Difiere de ChapterPhotoViewerContainer en qué pasa tras un movimiento con éxito: aquel navega
// al capítulo destino (tiene sentido, el visor ya estaba scoped a un único capítulo); este se
// queda donde está — el usuario puede seguir deslizando por la misma lista de fotos mixta en la
// que ya estaba — y se apoya en el toast de éxito de useAsyncAction para confirmar el movimiento.
export function CrossChapterPhotoViewerContainer({
  photo, photos, baulId, baulName, allChapters, onClose, onPhotoChange, chapterName,
}: CrossChapterPhotoViewerContainerProps) {
  const { run } = useAsyncAction();
  const posthog = usePostHog();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);

  const apiChapterId = photo.chapterId ?? null;
  const moveableChapters = allChapters.filter((chapter) => chapter.id !== apiChapterId);

  const handleMoveSubmit = async (newChapterName?: string) => {
    if (!moveTargetId) return;
    setIsSubmittingMove(true);
    const result = await run(async () => {
      if (newChapterName) {
        const newChapter = await createChapter(baulId, newChapterName);
        posthog.capture('chapter_created', { source: 'photo_viewer' });
        await movePhotos(baulId, apiChapterId, [photo.id], newChapter.id);
        return newChapter.id;
      }
      await movePhotos(baulId, apiChapterId, [photo.id], moveTargetId);
      return moveTargetId;
    }, {
      successMessage: 'Foto movida',
      errorMessage: 'Error al mover la foto',
    });
    setIsSubmittingMove(false);
    if (result.ok) {
      setShowMoveModal(false);
      setMoveTargetId('');
    }
  };

  const extraMenuItems: PhotoViewerMenuItem[] = [
    {
      key: 'move',
      label: 'Mover a otro capítulo',
      icon: FolderInput,
      onSelect: () => setShowMoveModal(true),
    },
  ];

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
        chapterName={chapterName}
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
