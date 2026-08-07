import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Photo, Recuerdo, TaggedPersona } from '@/types';
import { PhotoViewerHeader, PhotoViewerMenuItem } from '@/features/photos/components/PhotoViewerHeader';
import { PhotoStage } from '@/design-system/patterns/media/PhotoStage';
import { formatPartialDate } from '@/app/utils/timeUtils';
import { RecuerdoInput } from '@/features/memories/components/RecuerdoInput';
import { RecuerdosList } from '@/features/memories/components/RecuerdosList';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useVisualViewportInset } from '@/hooks/useVisualViewportInset';
import { Button } from '@/design-system/components/actions/Button';
import { PersonBadge } from '@/design-system/components/data-display/Badges';

interface PhotoViewerProps {
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
  onPhotoChange: (photo: Photo) => void;
  /** Menú "···" ya resuelto — construido por usePhotoViewerActions (vía buildMenuItems), a
   * través de PhotoViewerContainer/ChapterPhotoViewerContainer. Este componente no sabe qué
   * acciones hay ni de dónde vienen. */
  menuItems: PhotoViewerMenuItem[];
  canChangeDate: boolean;
  openDateModal: () => void;
  /** Modales del menú (fecha, retirada, borrado, etiquetado…), ya montados por quien nos
   * llama — este componente solo les hace sitio en el árbol. */
  modals: React.ReactNode;
  /** Personas etiquetadas en la foto actualmente mostrada. */
  taggedPersonas?: TaggedPersona[];
  recuerdos?: Recuerdo[];
  /** Recuerdos aún en vuelo (primera carga tras abrir la foto) — pinta un spinner pequeño en
   * vez del estado vacío, para no dar a entender por un instante que la foto no tiene ninguno. */
  recuerdosLoading?: boolean;
  onAddRecuerdo?: (text: string) => void;
  onUserClick?: (personaId: string) => void;
  onShareRecuerdo?: (recuerdo: Recuerdo) => void;
  onEditRecuerdo?: (recuerdo: Recuerdo, text: string) => Promise<boolean> | boolean | void;
}

function isEditableKeyTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

// 100% puro: nada de store/useCases/router aquí — todo lo que habla con servidor vive en
// PhotoViewerContainer (su único caller, junto con ChapterPhotoViewerContainer que lo
// envuelve). Ver docs/architecture/frontend.md.
export function PhotoViewer({
  photo,
  photos,
  onClose,
  onPhotoChange,
  menuItems,
  canChangeDate,
  openDateModal,
  modals,
  taggedPersonas = [],
  recuerdos = [],
  recuerdosLoading = false,
  onAddRecuerdo,
  onUserClick,
  onShareRecuerdo,
  onEditRecuerdo,
}: PhotoViewerProps) {
  useScrollLock();
  const viewportInset = useVisualViewportInset();

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

        {/* Cuerpo: en móvil se apila (foto arriba, recuerdos abajo, mitad y mitad); en
            escritorio pasa a 2 columnas, foto a la izquierda y recuerdos a la derecha
            ocupando ~1/3. La caja de la foto mide siempre lo mismo — fija, no depende de las
            dimensiones de la imagen ni de cuántos recuerdos haya cargados — y es la columna
            de recuerdos la que hace scroll propio dentro de su tamaño también fijo. */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          <div className="flex h-1/2 md:h-full md:flex-1 overflow-hidden">
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
          </div>

          {/* Info & Recuerdos section: dentro, solo la fecha y la lista hacen scroll propio,
              mientras el input se queda fijo abajo sin encogerse. */}
          <div className="flex flex-col flex-1 min-h-0 md:flex-none md:w-1/3 md:h-full md:border-l md:border-background/15">
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
              {recuerdosLoading ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-5 h-5 text-background/40 animate-spin" aria-label="Cargando recuerdos" />
                </div>
              ) : !hasRecuerdos ? (
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
                  onSubmit={onAddRecuerdo}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {modals}
    </>
  );
}
