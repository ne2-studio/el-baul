import React, { useState, useEffect, useRef } from 'react';
import { Download, BookImage, FolderInput, Calendar, Flag, Trash2, Tag } from 'lucide-react';
import { Chapter, Photo, PhotoDate, Persona, Recuerdo, TaggedPersona } from '@/types';
import { BaulIcon } from '@/design-system/foundations/icons/BaulIcon';
import { MoveModal } from '@/features/photos/components/MoveModal';
import { DateModal } from '@/design-system/patterns/forms/DateModal';
import { DeletePhotoModal } from '@/features/photos/components/DeletePhotoModal';
import { RemovalRequestModal } from '@/features/photos/components/RemovalRequestModal';
import { TagPersonasModal } from '@/features/photos/components/TagPersonasModal';
import { PhotoViewerHeader, PhotoViewerMenuItem } from '@/features/photos/components/PhotoViewerHeader';
import { PhotoStage } from '@/design-system/patterns/media/PhotoStage';
import { formatPartialDate } from '@/app/utils/timeUtils';
import { RecuerdoInput } from '@/features/memories/components/RecuerdoInput';
import { RecuerdosList } from '@/features/memories/components/RecuerdosList';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useVisualViewportInset } from '@/hooks/useVisualViewportInset';

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
  /** Personas etiquetadas en la foto actualmente mostrada. */
  taggedPersonas?: TaggedPersona[];
  /** Roster completo del baúl, para el checklist del modal de etiquetado. */
  baulPersonas?: Persona[];
  onSaveTags?: (photo: Photo, personaIds: string[]) => Promise<boolean>;
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
  onDownloadPhoto,
  taggedPersonas = [],
  baulPersonas = [],
  onSaveTags
}: PhotoViewerProps) {
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [isSubmittingRemoval, setIsSubmittingRemoval] = useState(false);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [isSubmittingDate, setIsSubmittingDate] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [isSubmittingTags, setIsSubmittingTags] = useState(false);

  useScrollLock();
  const viewportInset = useVisualViewportInset();

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
  };

  const openTagModal = () => {
    setSelectedPersonaIds(taggedPersonas.map((p) => p.id));
    setShowTagModal(true);
  };

  const toggleTaggedPersona = (personaId: string) => {
    setSelectedPersonaIds((current) =>
      current.includes(personaId) ? current.filter((id) => id !== personaId) : [...current, personaId]);
  };

  const handleTagsSubmit = async () => {
    if (!onSaveTags) return;
    setIsSubmittingTags(true);
    const ok = await onSaveTags(photo, selectedPersonaIds);
    setIsSubmittingTags(false);
    if (ok) setShowTagModal(false);
  };

  const menuItems: PhotoViewerMenuItem[] = [];
  if (onSaveTags) {
    menuItems.push({ key: 'tag-personas', label: 'Etiquetar personas', icon: Tag, onSelect: openTagModal });
  }
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
      <div
        className="fixed left-0 right-0 bg-foreground/95 z-50 flex flex-col"
        style={{ top: viewportInset.top, height: viewportInset.height }}
      >
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
        <div className="flex flex-col max-h-[50%]">
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

            {/* Tagged personas */}
            {taggedPersonas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {taggedPersonas.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => onUserClick && onUserClick(persona.id)}
                    disabled={!onUserClick}
                    className="flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full bg-background/10 hover:bg-background/20 transition-colors disabled:hover:bg-background/10"
                  >
                    {persona.avatarUrl ? (
                      <img src={persona.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-[10px] text-background/70">
                        {persona.nickname.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-background/80">{persona.nickname}</span>
                  </button>
                ))}
              </div>
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

      {/* Etiquetar personas modal */}
      {showTagModal && (
        <TagPersonasModal
          personas={baulPersonas}
          selectedIds={selectedPersonaIds}
          onToggle={toggleTaggedPersona}
          onCancel={() => setShowTagModal(false)}
          onConfirm={handleTagsSubmit}
          isSubmitting={isSubmittingTags}
        />
      )}
    </>
  );
}
