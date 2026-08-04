import React, { useRef } from 'react';
import { Check, MessageCircle } from 'lucide-react';
import type { Photo } from '@/types';
import { Button } from '@/design-system/components/actions/Button';
import { SwimlaneLabel } from '@/design-system/components/data-display/SwimlaneLabel';

// Groups photos by year+month (or by year alone, when only a year is known — never
// assume a month for display, that defaulting only applies to sorting), oldest first so
// the baúl reads like a story, with a trailing "Sin fecha" group for anything undated.
export function groupPhotosByYear(photos: Photo[]): { label: string; photos: Photo[] }[] {
  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const groups = new Map<string, { year: number; month?: number; photos: Photo[] }>();
  const undated: Photo[] = [];

  for (const photo of photos) {
    if (!photo.date) {
      undated.push(photo);
      continue;
    }
    const { year, month } = photo.date;
    const key = month ? `${year}-${month}` : `${year}`;
    if (!groups.has(key)) groups.set(key, { year, month, photos: [] });
    groups.get(key)!.photos.push(photo);
  }

  const sorted = Array.from(groups.values()).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : (a.month ?? 0) - (b.month ?? 0)
  );

  const result = sorted.map((g) => ({
    label: g.month ? `${MONTH_NAMES[g.month - 1]} ${g.year}` : `${g.year}`,
    photos: [...g.photos].sort((a, b) => (a.date?.day ?? 1) - (b.date?.day ?? 1)),
  }));

  if (undated.length > 0) result.push({ label: 'Sin fecha', photos: undated });

  return result;
}

interface PhotoSwimlanesProps {
  photos: Photo[];
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
