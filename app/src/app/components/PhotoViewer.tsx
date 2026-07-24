import React, { useState, useEffect, useRef } from 'react';
import { Download, BookImage, FolderInput, Calendar, Flag, Trash2 } from 'lucide-react';
import { Photo } from './PhotosView';
import { BaulIcon } from './BaulIcon';
import { MoveModal } from './MoveModal';
import { DateModal } from './DateModal';
import { DeletePhotoModal } from './DeletePhotoModal';
import { RemovalRequestModal } from './RemovalRequestModal';
import { ConfirmationToast } from './ConfirmationToast';
import { PhotoViewerHeader, PhotoViewerMenuItem } from './PhotoViewerHeader';
import { PhotoStage } from './PhotoStage';
import { Chapter } from './ChaptersView';
import { formatPartialDate } from '../utils/timeUtils';
import { RecuerdoInput } from './RecuerdoInput';
import { RecuerdosList } from './RecuerdosList';
import { Recuerdo } from './RecuerdoCard';
import { PhotoDate } from '@/types';

interface PhotoViewerProps {
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
  onPhotoChange: (photo: Photo) => void;
  /** Devuelven si la operación tuvo éxito — el modal correspondiente se queda abierto
   * (con spinner) hasta saberlo, y solo se cierra por sí solo si el resultado fue true. */
  onRequestRemoval?: (photo: Photo, reason: string) => Promise<boolean>;
  isAdmin?: boolean;
  onSetBaulCover?: (photo: Photo) => void;
  onSetChapterCover?: (photo: Photo) => void;
  onMovePhoto?: (photo: Photo, targetChapterId: string) => Promise<boolean>;
  onChangeDate?: (photo: Photo, date: PhotoDate) => Promise<boolean>;
  onDeletePhoto?: (photo: Photo, reason: string) => Promise<boolean>;
  allChapters?: Chapter[];
  currentChapter?: Chapter;
  recuerdos?: Recuerdo[];
  onAddRecuerdo?: (photoId: string, text: string) => void;
  onUserClick?: (personaId: string) => void;
  onDownloadPhoto?: (photo: Photo) => void;
}

export function PhotoViewer({
  photo,
  photos,
  onClose,
  onPhotoChange,
  onRequestRemoval,
  isAdmin,
  onSetBaulCover,
  onSetChapterCover,
  onMovePhoto,
  onChangeDate,
  onDeletePhoto,
  allChapters = [],
  currentChapter,
  recuerdos = [],
  onAddRecuerdo,
  onUserClick,
  onDownloadPhoto
}: PhotoViewerProps) {
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSubmittingRemoval, setIsSubmittingRemoval] = useState(false);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [isSubmittingDate, setIsSubmittingDate] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);

  const moveableChapters = allChapters.filter(a => a.id !== currentChapter?.id);

  const currentIndex = photos.findIndex(p => p.id === photo.id);
  const hasRecuerdos = recuerdos.length > 0;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      onPhotoChange(photos[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onPhotoChange(photos[currentIndex + 1]);
    }
  };

  // Dirección del carrusel: +1 al avanzar, -1 al retroceder — recalculada cada vez que
  // cambia la foto mostrada, sin importar cómo se llegó a ella (swipe, flechas, teclado).
  // Se calcula en el propio render (no en un useEffect) porque PhotoStage necesita el
  // valor ya actualizado en el mismo render en que cambia photoKey: si se calculara en un
  // efecto, llegaría un render tarde y el primer cambio de sentido tras invertir la
  // dirección de navegación animaría hacia el lado equivocado.
  const previousIndexRef = useRef(currentIndex);
  const directionRef = useRef(0);
  if (currentIndex !== previousIndexRef.current) {
    directionRef.current = currentIndex > previousIndexRef.current ? 1 : -1;
    previousIndexRef.current = currentIndex;
  }
  const direction = directionRef.current;

  // Precarga la foto anterior y siguiente para que el swipe se sienta instantáneo.
  useEffect(() => {
    [photos[currentIndex - 1], photos[currentIndex + 1]].forEach((neighbor) => {
      if (!neighbor) return;
      const img = new Image();
      img.src = neighbor.fullUrl;
    });
  }, [currentIndex, photos]);

  const handleSubmitRequest = async (reason: string) => {
    if (!onRequestRemoval) return;
    setIsSubmittingRemoval(true);
    const ok = await onRequestRemoval(photo, reason);
    setIsSubmittingRemoval(false);
    if (!ok) return;

    setShowRemovalModal(false);
    setShowConfirmation(true);

    // Auto-close confirmation after 3 seconds
    setTimeout(() => {
      setShowConfirmation(false);
    }, 3000);
  };

  const menuItems: PhotoViewerMenuItem[] = [];
  if (onDownloadPhoto) {
    menuItems.push({ key: 'download', label: 'Descargar foto original', icon: Download, onSelect: () => onDownloadPhoto(photo) });
  }
  if (onSetChapterCover) {
    menuItems.push({ key: 'chapter-cover', label: 'Establecer como portada del capítulo', icon: BookImage, onSelect: () => onSetChapterCover(photo) });
  }
  if (isAdmin && onSetBaulCover) {
    menuItems.push({ key: 'baul-cover', label: 'Establecer como portada del baúl', icon: BaulIcon, onSelect: () => onSetBaulCover(photo) });
  }
  if (onMovePhoto && moveableChapters.length > 0) {
    menuItems.push({ key: 'move', label: 'Mover a otro capítulo', icon: FolderInput, onSelect: () => setShowMoveModal(true) });
  }
  if (onChangeDate) {
    menuItems.push({ key: 'date', label: 'Cambiar fecha', icon: Calendar, onSelect: () => setShowDateModal(true) });
  }
  if (!isAdmin && onRequestRemoval) {
    menuItems.push({ key: 'removal', label: 'Solicitar retirada', icon: Flag, onSelect: () => setShowRemovalModal(true) });
  }
  if (isAdmin && onDeletePhoto) {
    menuItems.push({ key: 'delete', label: 'Retirar foto', icon: Trash2, onSelect: () => setShowDeleteModal(true), variant: 'destructive' });
  }

  const handleMoveSubmit = async () => {
    if (!moveTargetId || !onMovePhoto) return;
    setIsSubmittingMove(true);
    const ok = await onMovePhoto(photo, moveTargetId);
    setIsSubmittingMove(false);
    if (ok) {
      setShowMoveModal(false);
      setMoveTargetId('');
    }
  };

  const handleDateSubmit = async (date: PhotoDate) => {
    if (!onChangeDate) return;
    setIsSubmittingDate(true);
    const ok = await onChangeDate(photo, date);
    setIsSubmittingDate(false);
    if (ok) setShowDateModal(false);
  };

  const handleDeleteSubmit = async (reason: string) => {
    if (!onDeletePhoto) return;
    setIsDeletingPhoto(true);
    const ok = await onDeletePhoto(photo, reason);
    setIsDeletingPhoto(false);
    if (ok) setShowDeleteModal(false);
  };

  const handleAddRecuerdo = (text: string) => {
    if (onAddRecuerdo) {
      onAddRecuerdo(photo.id, text);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, photos]);

  return (
    <>
      <div className="fixed inset-0 bg-foreground/95 z-50 flex flex-col">
        <PhotoViewerHeader
          currentIndex={currentIndex}
          totalCount={photos.length}
          onClose={onClose}
          menuItems={menuItems}
        />

        <PhotoStage
          photoKey={photo.id}
          src={photo.fullUrl}
          alt="Foto"
          direction={direction}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />

        {/* Info & Recuerdos section: el conjunto no supera el 50% de la pantalla; dentro,
            solo la fecha y la lista hacen scroll propio, mientras el input se queda fijo
            abajo sin encogerse. */}
        <div className="flex flex-col max-h-[50vh]">
          <div className="px-6 pt-8 pb-4 space-y-8 overflow-y-auto min-h-0">
            {/* Date */}
            {(photo.date || onChangeDate) && (
              <button
                onClick={() => onChangeDate && setShowDateModal(true)}
                disabled={!onChangeDate}
                className="text-xs text-background/60 hover:text-background/80 transition-colors disabled:hover:text-background/60"
              >
                {photo.date ? formatPartialDate(photo.date) : 'Sin fecha · Toca para añadir'}
              </button>
            )}

            {/* Recuerdos List */}
            {!hasRecuerdos ? (
              <div className="text-center">
                <p className="text-background/50 text-sm mb-2">
                  Sé el primero en añadir un recuerdo
                </p>
              </div>
            ) : (
              <RecuerdosList recuerdos={recuerdos} onUserClick={onUserClick} />
            )}
          </div>

          {onAddRecuerdo && (
            <div className="px-6 pb-6 pt-2 flex-shrink-0">
              <RecuerdoInput
                photoId={photo.id}
                onSubmit={handleAddRecuerdo}
              />
            </div>
          )}
        </div>
      </div>

      {/* Removal request modal */}
      {showRemovalModal && (
        <RemovalRequestModal
          onCancel={() => setShowRemovalModal(false)}
          onConfirm={handleSubmitRequest}
          isSubmitting={isSubmittingRemoval}
        />
      )}

      {/* Confirmation toast */}
      {showConfirmation && (
        <ConfirmationToast message="Tu solicitud ha sido enviada al custodio del baúl." />
      )}

      {/* Mover a otro capítulo modal */}
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

      {/* Cambiar fecha modal */}
      {showDateModal && (
        <DateModal
          title="Cambiar fecha de la foto"
          onCancel={() => setShowDateModal(false)}
          onConfirm={handleDateSubmit}
          isSubmitting={isSubmittingDate}
        />
      )}

      {/* Retirar foto modal */}
      {showDeleteModal && (
        <DeletePhotoModal
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteSubmit}
          isSubmitting={isDeletingPhoto}
        />
      )}
    </>
  );
}
