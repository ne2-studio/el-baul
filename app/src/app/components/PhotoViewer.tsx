import React, { useState, useEffect, useRef } from 'react';
import { Photo } from './PhotosView';
import { MoveModal } from './MoveModal';
import { DateModal } from './DateModal';
import { DeletePhotoModal } from './DeletePhotoModal';
import { RemovalRequestModal } from './RemovalRequestModal';
import { ConfirmationToast } from './ConfirmationToast';
import { PhotoViewerHeader, PhotoViewerMenuItem } from './PhotoViewerHeader';
import { PhotoStage } from './PhotoStage';
import { Album } from './AlbumsView';
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
  onSetAlbumCover?: (photo: Photo) => void;
  onMovePhoto?: (photo: Photo, targetAlbumId: string) => Promise<boolean>;
  onChangeDate?: (photo: Photo, date: PhotoDate) => Promise<boolean>;
  onDeletePhoto?: (photo: Photo, reason: string) => Promise<boolean>;
  allAlbums?: Album[];
  currentAlbum?: Album;
  recuerdos?: Recuerdo[];
  onAddRecuerdo?: (photoId: string, text: string) => void;
  onUserClick?: (sharedUserId: string) => void;
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
  onSetAlbumCover,
  onMovePhoto,
  onChangeDate,
  onDeletePhoto,
  allAlbums = [],
  currentAlbum,
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

  const moveableAlbums = allAlbums.filter(a => a.id !== currentAlbum?.id);

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
  const previousIndexRef = useRef(currentIndex);
  const [direction, setDirection] = useState(0);
  useEffect(() => {
    if (currentIndex !== previousIndexRef.current) {
      setDirection(currentIndex > previousIndexRef.current ? 1 : -1);
      previousIndexRef.current = currentIndex;
    }
  }, [currentIndex]);

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
    menuItems.push({ key: 'download', label: 'Descargar foto original', onSelect: () => onDownloadPhoto(photo) });
  }
  if (onSetAlbumCover) {
    menuItems.push({ key: 'album-cover', label: 'Establecer como portada del capítulo', onSelect: () => onSetAlbumCover(photo) });
  }
  if (isAdmin && onSetBaulCover) {
    menuItems.push({ key: 'baul-cover', label: 'Establecer como portada del baúl', onSelect: () => onSetBaulCover(photo) });
  }
  if (onMovePhoto && moveableAlbums.length > 0) {
    menuItems.push({ key: 'move', label: 'Mover a otro capítulo', onSelect: () => setShowMoveModal(true) });
  }
  if (onChangeDate) {
    menuItems.push({ key: 'date', label: 'Cambiar fecha', onSelect: () => setShowDateModal(true) });
  }
  if (!isAdmin && onRequestRemoval) {
    menuItems.push({ key: 'removal', label: 'Solicitar retirada', onSelect: () => setShowRemovalModal(true) });
  }
  if (isAdmin && onDeletePhoto) {
    menuItems.push({ key: 'delete', label: 'Retirar foto', onSelect: () => setShowDeleteModal(true), variant: 'destructive' });
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
          alt={photo.caption || 'Foto'}
          direction={direction}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />

        {/* Info & Recuerdos section */}
        <div className="px-6 py-8 space-y-8 max-h-[50vh] overflow-y-auto">
          {/* Caption */}
          {photo.caption && (
            <p className="text-background/90 text-sm leading-relaxed">{photo.caption}</p>
          )}

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

          {/* Recuerdos List & Input */}
          <div className="space-y-6">
            {!hasRecuerdos ? (
              <div className="text-center">
                <p className="text-background/50 text-sm mb-2">
                  Sé el primero en añadir un recuerdo
                </p>
              </div>
            ) : (
              <RecuerdosList recuerdos={recuerdos} onUserClick={onUserClick} />
            )}

            {onAddRecuerdo && (
              <div className="pt-2">
                <RecuerdoInput
                  photoId={photo.id}
                  onSubmit={handleAddRecuerdo}
                />
              </div>
            )}
          </div>
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
          albums={moveableAlbums}
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
