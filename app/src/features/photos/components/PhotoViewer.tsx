import React, { useEffect, useRef } from 'react';
import { Photo, Persona, Recuerdo, TaggedPersona } from '@/types';
import { PhotoViewerHeader } from '@/features/photos/components/PhotoViewerHeader';
import { PhotoStage } from '@/design-system/patterns/media/PhotoStage';
import { formatPartialDate } from '@/app/utils/timeUtils';
import { RecuerdoInput } from '@/features/memories/components/RecuerdoInput';
import { RecuerdosList } from '@/features/memories/components/RecuerdosList';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useVisualViewportInset } from '@/hooks/useVisualViewportInset';
import { Button } from '@/design-system/components/actions/Button';
import { PersonBadge } from '@/design-system/components/data-display/Badges';
import { PhotoViewerChapterScope, usePhotoSettingsMenu } from '@/features/photos/containers/usePhotoSettingsMenu';

interface PhotoViewerProps {
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
  onPhotoChange: (photo: Photo) => void;
  baulId: string;
  baulName: string;
  isAdmin?: boolean;
  sharedLinksEnabled?: boolean;
  /** Roster completo del baúl, para el checklist del modal de etiquetado. */
  baulPersonas?: Persona[];
  /** Personas etiquetadas en la foto actualmente mostrada. */
  taggedPersonas?: TaggedPersona[];
  /** Absent for viewers with no baúl/chapter scope (e.g. a persona's tagged photos, which
   * cross chapters freely) — see usePhotoSettingsMenu's own doc for what that disables. */
  chapter?: PhotoViewerChapterScope;
  recuerdos?: Recuerdo[];
  onAddRecuerdo?: (photoId: string, text: string) => void;
  onUserClick?: (personaId: string) => void;
  onShareRecuerdo?: (recuerdo: Recuerdo) => void;
  onEditRecuerdo?: (recuerdo: Recuerdo, text: string) => Promise<boolean> | boolean | void;
}

function isEditableKeyTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

export function PhotoViewer({
  photo,
  photos,
  onClose,
  onPhotoChange,
  baulId,
  baulName,
  isAdmin,
  sharedLinksEnabled = false,
  baulPersonas = [],
  taggedPersonas = [],
  chapter,
  recuerdos = [],
  onAddRecuerdo,
  onUserClick,
  onShareRecuerdo,
  onEditRecuerdo,
}: PhotoViewerProps) {
  useScrollLock();
  const viewportInset = useVisualViewportInset();

  const { menuItems, canChangeDate, openDateModal, modals } = usePhotoSettingsMenu({
    baulId, baulName, photo, isAdmin, sharedLinksEnabled, baulPersonas, taggedPersonas, chapter,
  });

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

  const handleAddRecuerdo = (text: string) => {
    if (onAddRecuerdo) {
      onAddRecuerdo(photo.id, text);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && isEditableKeyTarget(e.target)) {
        return;
      }

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
        className="fixed left-0 right-0 bg-foreground/95 z-50 flex flex-col pt-safe pb-safe"
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
            {(photo.date || canChangeDate) && (
              <Button variant="plain"
                onClick={() => canChangeDate && openDateModal()}
                disabled={!canChangeDate}
                className="text-xs text-background/60 hover:text-background/80 transition-colors disabled:hover:text-background/60"
              >
                {photo.date ? formatPartialDate(photo.date) : 'Sin fecha · Toca para añadir'}
              </Button>
            )}

            {/* Tagged personas */}
            {taggedPersonas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {taggedPersonas.map((persona) => (
                  <PersonBadge
                    key={persona.id}
                    nickname={persona.nickname}
                    avatarUrl={persona.avatarUrl}
                    onClick={onUserClick ? () => onUserClick(persona.id) : undefined}
                  />
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
              <RecuerdosList
                recuerdos={recuerdos}
                onUserClick={onUserClick}
                onShareRecuerdo={onShareRecuerdo}
                onEditRecuerdo={onEditRecuerdo}
              />
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

      {modals}
    </>
  );
}
