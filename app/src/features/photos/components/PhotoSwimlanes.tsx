import React, { useRef } from 'react';
import { Check, MessageCircle } from 'lucide-react';
import type { Photo } from '@/types';
import { Button } from '@/design-system/components/actions/Button';
import { SwimlaneLabel } from '@/design-system/components/data-display/SwimlaneLabel';
import { groupPhotosByYear } from '@/features/photos/components/photoGrouping';

interface PhotoSwimlanesProps {
  photos: Photo[];
  /** Pinned above the date-grouped swimlanes, e.g. right after an upload — see
   * ChapterRoute/PhotosView. Not deduplicated against `photos`: the same photo also shows
   * in its normal date group below, since this is a "just added" shelf, not a filter. */
  recentlyAddedPhotos?: Photo[];
  onSelectPhoto: (photo: Photo) => void;
  /** Selection-mode props are optional — screens without batch selection (e.g. the
   * persona sheet) can omit them entirely and just get a plain grouped grid. */
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onLongPress?: (id: string) => void;
  onToggleGroup?: (photos: Photo[]) => void;
}

export function PhotoSwimlanes({
  photos,
  recentlyAddedPhotos = [],
  onSelectPhoto,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
  onLongPress,
  onToggleGroup,
}: PhotoSwimlanesProps) {
  const ids = selectedIds ?? new Set<string>();

  return (
    <div className="space-y-6">
      {recentlyAddedPhotos.length > 0 && (
        <div>
          <SwimlaneLabel
            onClick={onToggleGroup ? () => onToggleGroup(recentlyAddedPhotos) : undefined}
            selected={selectionMode ? recentlyAddedPhotos.every((p) => ids.has(p.id)) : undefined}
          >
            Añadido recientemente
          </SwimlaneLabel>
          <PhotoGrid
            photos={recentlyAddedPhotos}
            selectionMode={selectionMode}
            selectedIds={ids}
            onSelectPhoto={onSelectPhoto}
            onToggleSelect={onToggleSelect ?? (() => {})}
            onLongPress={onLongPress ?? (() => {})}
          />
        </div>
      )}

      {groupPhotosByYear(photos).map((group) => {
        const groupAllSelected = group.photos.every((p) => ids.has(p.id));
        return (
          <div key={group.label}>
            <SwimlaneLabel
              onClick={onToggleGroup ? () => onToggleGroup(group.photos) : undefined}
              selected={selectionMode ? groupAllSelected : undefined}
            >
              {group.label}
            </SwimlaneLabel>
            <PhotoGrid
              photos={group.photos}
              selectionMode={selectionMode}
              selectedIds={ids}
              onSelectPhoto={onSelectPhoto}
              onToggleSelect={onToggleSelect ?? (() => {})}
              onLongPress={onLongPress ?? (() => {})}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Photo Grid ───────────────────────────────────────────────────────────────
function PhotoGrid({
  photos,
  selectionMode,
  selectedIds,
  onSelectPhoto,
  onToggleSelect,
  onLongPress,
}: {
  photos: Photo[];
  selectionMode: boolean;
  selectedIds: Set<string>;
  onSelectPhoto: (p: Photo) => void;
  onToggleSelect: (id: string) => void;
  onLongPress: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map(photo => (
        <PhotoCell
          key={photo.id}
          photo={photo}
          selectionMode={selectionMode}
          isSelected={selectedIds.has(photo.id)}
          onOpen={onSelectPhoto}
          onToggleSelect={onToggleSelect}
          onLongPress={onLongPress}
        />
      ))}
    </div>
  );
}

function PhotoCell({
  photo,
  selectionMode,
  isSelected,
  onOpen,
  onToggleSelect,
  onLongPress,
}: {
  photo: Photo;
  selectionMode: boolean;
  isSelected: boolean;
  onOpen: (p: Photo) => void;
  onToggleSelect: (id: string) => void;
  onLongPress: (id: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const didLongPressRef = useRef(false);

  const cancelTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    didLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      onLongPress(photo.id);
    }, 500);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPosRef.current) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 8) cancelTimer();
  };

  const handlePointerUp = () => cancelTimer();

  const handleClick = () => {
    if (didLongPressRef.current) {
      didLongPressRef.current = false;
      return; // long-press already handled — don't open
    }
    if (selectionMode) {
      onToggleSelect(photo.id);
    } else {
      onOpen(photo);
    }
  };

  return (
    <Button variant="plain"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
      className={`aspect-square bg-secondary rounded-lg overflow-hidden transition-all relative group select-none ${
        isSelected ? 'ring-2 ring-primary ring-offset-1' : 'hover:opacity-90 active:opacity-80'
      }`}
    >
      <img
        src={photo.thumbnailUrl}
        alt="Foto"
        className="w-full h-full object-cover pointer-events-none"
        draggable={false}
      />
      {(photo.recuerdoCount || 0) > 0 && !selectionMode && (
        <div className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-75 group-hover:opacity-90 transition-opacity">
          <MessageCircle className="w-3.5 h-3.5 text-foreground/70" strokeWidth={1.5} />
        </div>
      )}
      {/* Selection circle — top-left, like Google Photos: hidden until the photo is hovered,
          filled on hover (preview) or when actually selected. Always visible once selection
          mode is active. A click here selects this photo without opening it. */}
      <div
        role="checkbox"
        aria-checked={isSelected}
        aria-label={isSelected ? 'Quitar de la selección' : 'Seleccionar foto'}
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          if (selectionMode) {
            onToggleSelect(photo.id);
          } else {
            onLongPress(photo.id);
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        className={`group/checkbox absolute top-1.5 left-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
          selectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } ${
          isSelected ? 'bg-primary border-primary' : 'bg-background/60 border-white hover:bg-primary hover:border-primary'
        }`}
      >
        <Check className={`w-3 h-3 text-white transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover/checkbox:opacity-100'
        }`} />
      </div>
    </Button>
  );
}
