import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, MessageCircle } from 'lucide-react';
import { GalleryPhoto, Recuerdo, TaggedPersona } from '@/types';
import { PhotoViewerHeader, PhotoViewerMenuItem } from '@/features/photos/components/PhotoViewerHeader';
import { PhotoStage } from '@/design-system/patterns/media/PhotoStage';
import { formatPartialDate } from '@/app/utils/timeUtils';
import { RecuerdoInput } from '@/features/memories/components/RecuerdoInput';
import { RecuerdosList } from '@/features/memories/components/RecuerdosList';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useVisualViewportInset } from '@/hooks/useVisualViewportInset';
import { useIsDesktopViewport } from '@/hooks/useIsDesktopViewport';
import { Button } from '@/design-system/components/actions/Button';
import { IconButton } from '@/design-system/components/actions/IconButton';
import { Avatar } from '@/design-system/components/data-display/Avatar';
import { ChapterBadge, PersonBadge } from '@/design-system/components/data-display/Badges';
import { cn } from '@/design-system/components/ui/utils';

// Generic over GalleryPhoto — only photo.id/date/thumbnailUrl/fullUrl are ever read directly
// below; everything baúl-specific (menu actions, chapter badge, recuerdos) arrives as
// already-resolved props from whichever container mounts this. That's what lets
// MyPhotoViewerContainer ("Mis fotos", no single baúl) reuse this same component instead of
// PhotoViewer pretending a PhotoAsset is a Photo.
interface PhotoViewerProps<T extends GalleryPhoto> {
  photo: T;
  photos: T[];
  onClose: () => void;
  onPhotoChange: (photo: T) => void;
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
  /** Nombre del capítulo al que pertenece la foto — quien nos monta ya lo resuelve (currentChapter,
   * o cruzando photo.chapterId contra la lista de capítulos del baúl). */
  chapterName?: string;
  /** false cuando la foto no tiene capítulo, o cuando el visor ya se muestra dentro de ese
   * propio capítulo — mismo patrón que showChapterBadge en RecuerdoFeedCard, para no enlazar a
   * donde ya estás. */
  showChapterBadge?: boolean;
  onChapterClick?: () => void;
  recuerdos?: Recuerdo[];
  /** Recuerdos aún en vuelo (primera carga tras abrir la foto) — pinta un spinner pequeño en
   * vez del estado vacío, para no dar a entender por un instante que la foto no tiene ninguno. */
  recuerdosLoading?: boolean;
  onAddRecuerdo?: (text: string) => void;
  onUserClick?: (personaId: string) => void;
  onShareRecuerdo?: (recuerdo: Recuerdo) => void;
  onEditRecuerdo?: (recuerdo: Recuerdo, text: string) => Promise<boolean> | boolean | void;
  /** Baúles this PhotoAsset appears in — only used by "Mis fotos" (MyPhotoViewerContainer),
   * which has no single baúl to hang a ChapterBadge off of. Already limited to baúles the
   * current user can access — see MyPhotosReadManager.GetMyPhotosAsync on the backend. An empty
   * array (as opposed to undefined) is a valid first-class state since Slice 3 (docs/.backlog
   * issue #62): a photo uploaded directly into Mis fotos starts out in zero baúles. */
  baulNames?: string[];
  /** "Añadir a un baúl" CTA shown in the zero-baúles empty state below — undefined when there's
   * nowhere left to add this asset to (see useMyPhotoViewerActions). */
  onAddToBaul?: () => void;
}

function isEditableKeyTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

// 100% puro: nada de store/useCases/router aquí — todo lo que habla con servidor vive en
// PhotoViewerContainer (su único caller, junto con ChapterPhotoViewerContainer que lo
// envuelve). Ver docs/architecture/frontend.md.
export function PhotoViewer<T extends GalleryPhoto>({
  photo,
  photos,
  onClose,
  onPhotoChange,
  menuItems,
  canChangeDate,
  openDateModal,
  modals,
  taggedPersonas = [],
  chapterName,
  showChapterBadge = false,
  onChapterClick,
  recuerdos = [],
  recuerdosLoading = false,
  onAddRecuerdo,
  onUserClick,
  onShareRecuerdo,
  onEditRecuerdo,
  baulNames,
  onAddToBaul,
}: PhotoViewerProps<T>) {
  useScrollLock();
  const viewportInset = useVisualViewportInset();
  // Gates the desktop layout (static header, side panel) on width AND height, not just
  // Tailwind's `md:` width-only breakpoint — a phone rotated to landscape can cross 768px in
  // width while staying short, and must keep the full-bleed mobile layout instead of losing
  // space to a header bar and side panel it doesn't have room for.
  const isDesktopLayout = useIsDesktopViewport();
  // El panel de recuerdos empieza contraído para que la foto ocupe todo el visor — el usuario
  // lo despliega a demanda (barra inferior en móvil, franja lateral en escritorio).
  const [panelExpanded, setPanelExpanded] = useState(false);

  const currentIndex = photos.findIndex(p => p.id === photo.id);
  // Mis fotos (MyPhotoViewerContainer) never passes onAddRecuerdo — see this component's
  // top-of-file comment and useMyPhotoViewerActions (Slice 5, docs/.backlog issue #62): no
  // tagging, recuerdos or date editing there. Its presence is the natural signal for whether
  // the recuerdos-specific UI (title, empty state, list, input) applies to this viewer context.
  const recuerdosEnabled = onAddRecuerdo !== undefined;
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

  const extraTaggedCount = Math.max(0, taggedPersonas.length - 3);

  // Contenido del panel de recuerdos (fecha, personas etiquetadas, lista, input) — compartido
  // entre la franja de escritorio (siempre visible, como en el diseño original) y la hoja
  // desplegable de móvil (colapsada por defecto).
  const infoContent = (
    <>
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

        {/* Tagged personas + chapter badge */}
        {(taggedPersonas.length > 0 || showChapterBadge) && (
          <div className="space-y-2">
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

            {showChapterBadge && (
              <ChapterBadge chapterName={chapterName} onClick={onChapterClick} />
            )}
          </div>
        )}

        {/* Baúl appearances — "Mis fotos" only, see baulNames' doc comment. Zero baúles is a
            valid first-class state (Slice 3), not an error — see onAddToBaul's doc comment. */}
        {baulNames && baulNames.length > 0 && (
          <p className="text-xs text-background/60">
            Aparece en: {baulNames.join(', ')}
          </p>
        )}
        {baulNames && baulNames.length === 0 && (
          <div className="space-y-1">
            <p className="text-xs text-background/60">Todavía no aparece en ningún baúl.</p>
            {onAddToBaul && (
              <Button variant="plain"
                onClick={onAddToBaul}
                className="text-xs text-background/80 underline hover:text-background"
              >
                Añadir a un baúl
              </Button>
            )}
          </div>
        )}

        {/* Recuerdos List — not applicable to Mis fotos, see recuerdosEnabled's doc comment. */}
        {recuerdosEnabled && (
          recuerdosLoading ? (
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
          )
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
    </>
  );

  return (
    <>
      <div
        className="fixed left-0 right-0 bg-foreground z-50 flex flex-col overflow-hidden"
        style={{ top: viewportInset.top, height: viewportInset.height }}
      >
        {/* Header: en móvil flota sobre la foto a pantalla completa; en escritorio vuelve a ser
            una barra normal que empuja la foto hacia abajo, como en el diseño original. */}
        <div
          className={cn(
            'absolute inset-x-0 top-0 z-30 pt-safe pointer-events-none',
            isDesktopLayout && 'static pt-0 pointer-events-auto z-auto'
          )}
        >
          <PhotoViewerHeader
            currentIndex={currentIndex}
            totalCount={photos.length}
            onClose={onClose}
            menuItems={menuItems}
          />
        </div>

        {/* Cuerpo: en móvil la foto ocupa todo el visor y el panel de recuerdos flota encima,
            colapsado por defecto (barra inferior desplegable). En escritorio vuelve al layout
            de siempre: foto a la izquierda, panel de recuerdos siempre visible a la derecha. */}
        <div className={cn('flex-1 flex flex-col min-h-0 relative', isDesktopLayout && 'flex-row')}>
          <div
            className={cn(
              'absolute inset-0 flex overflow-hidden',
              isDesktopLayout && 'static flex-1 h-full'
            )}
          >
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

          {/* Panel de escritorio: siempre visible, sin colapsar. */}
          {isDesktopLayout && (
            <div className="flex flex-col flex-none w-1/3 h-full border-l border-background/15">
              {infoContent}
            </div>
          )}

          {/* Panel de móvil: colapsado por defecto (barra inferior); desplegado, hoja flotante
              sobre la foto que sube desde abajo. */}
          {!isDesktopLayout && (
            <>
              {panelExpanded ? (
                <div className="absolute z-20 flex flex-col bg-foreground/95 backdrop-blur-sm inset-x-0 bottom-0 max-h-[50%] rounded-t-2xl pb-safe">
                  <div className="flex items-center justify-between gap-2 px-6 pt-5 pb-1 flex-shrink-0">
                    <h2 className="text-background font-semibold">{recuerdosEnabled ? 'Recuerdos' : 'Información'}</h2>
                    <IconButton
                      onClick={() => setPanelExpanded(false)}
                      aria-label={recuerdosEnabled ? 'Contraer panel de recuerdos' : 'Contraer panel de información'}
                      tone="inverse"
                    >
                      <ChevronDown className="w-5 h-5 text-background" aria-hidden />
                    </IconButton>
                  </div>

                  {infoContent}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPanelExpanded(true)}
                  aria-label={recuerdosEnabled ? 'Ver recuerdos' : 'Ver información'}
                  className="absolute z-20 bg-foreground/90 backdrop-blur-sm text-left inset-x-0 bottom-0 rounded-t-2xl pb-safe"
                >
                  {/* padding visual en su propio wrapper: si compartiera elemento con pb-safe, ese
                      padding-bottom (0 fuera de iOS nativo) le ganaría en cascada al de aquí, por
                      venir declarado después en index.css — ver BottomSheetModal/AiChatScreen para
                      el mismo patrón de separar ambos paddings. */}
                  <div className="flex items-center gap-3 h-16 px-4">
                    {(photo.recuerdoCount || 0) > 0 && (
                      <MessageCircle
                        data-testid="recuerdos-hint-icon"
                        className="w-4 h-4 text-background/70 flex-shrink-0"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                    )}

                    {taggedPersonas.length > 0 && (
                      <div className="flex -space-x-2">
                        {taggedPersonas.slice(0, 3).map((persona) => (
                          <Avatar
                            key={persona.id}
                            name={persona.nickname}
                            src={persona.avatarUrl}
                            size={8}
                            className="bg-background/20 text-background/70 ring-2 ring-foreground"
                          />
                        ))}
                        {extraTaggedCount > 0 && (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium bg-background/20 text-background/70 ring-2 ring-foreground">
                            +{extraTaggedCount}
                          </div>
                        )}
                      </div>
                    )}

                    <span className="flex-1 text-background/70 text-sm">
                      {photo.date ? formatPartialDate(photo.date) : 'Sin fecha'}
                    </span>

                    <ChevronUp className="w-5 h-5 text-background" aria-hidden />
                  </div>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {modals}
    </>
  );
}
