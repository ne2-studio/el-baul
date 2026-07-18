import React, { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { SimpleFAB } from './FAB';
import { ChevronLeft, Plus, ImageIcon, MessageCircle, Check, FolderInput } from 'lucide-react';
import { Album } from './AlbumsView';
import { SelectedPhoto } from './UploadConfirmationScreen';

export interface Photo {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  caption?: string;
  date?: string;
  recuerdoCount?: number;
}

interface PhotosViewProps {
  album: Album;
  photos: Photo[];
  onBack: () => void;
  onSelectPhoto: (photo: Photo) => void;
  onAddPhotos: (selectedPhotos: SelectedPhoto[]) => void;
  allAlbums?: Album[];
  onBatchMove?: (photoIds: string[], targetAlbumId: string) => void;
}

export function PhotosView({ album, photos, onBack, onSelectPhoto, onAddPhotos, allAlbums = [], onBatchMove }: PhotosViewProps) {
  const totalRecuerdos = photos.reduce((sum, photo) => sum + (photo.recuerdoCount || 0), 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Auto-exit selection when nothing is selected
  useEffect(() => {
    if (selectionMode && selectedIds.size === 0) {
      setSelectionMode(false);
    }
  }, [selectedIds.size, selectionMode]);

  const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
  const [batchMoveTargetId, setBatchMoveTargetId] = useState('');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleLongPress = (photoId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([photoId]));
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchMoveSubmit = () => {
    if (!batchMoveTargetId) return;
    onBatchMove?.(Array.from(selectedIds), batchMoveTargetId);
    setShowBatchMoveModal(false);
    setBatchMoveTargetId('');
    exitSelection();
  };

  const moveableAlbums = allAlbums.filter(a => a.id !== album.id);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedPhotos: SelectedPhoto[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file)
    }));

    e.target.value = '';
    onAddPhotos(selectedPhotos);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={selectionMode ? exitSelection : onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">{selectionMode ? 'Cancelar' : 'Volver'}</span>
            </button>
            {selectionMode && (
              <button onClick={exitSelection} className="text-sm text-primary font-medium">
                Cancelar
              </button>
            )}
          </div>
          <h1 className="text-3xl text-foreground">
            {selectionMode ? `${selectedIds.size} ${selectedIds.size === 1 ? 'seleccionada' : 'seleccionadas'}` : album.name}
          </h1>
          {!selectionMode && album.description && (
            <p className="text-sm text-muted-foreground mt-1">{album.description}</p>
          )}
          {!selectionMode && totalRecuerdos > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <MessageCircle className="w-3.5 h-3.5 text-muted-foreground/60" strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground/75">
                {totalRecuerdos} {totalRecuerdos === 1 ? 'recuerdo' : 'recuerdos'} en este álbum
              </span>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6 pb-28">
        {photos.length === 0 ? (
          <div>
            <EmptyState
              icon={<ImageIcon className="w-20 h-20" strokeWidth={1.5} />}
              title="Todavía no hay fotos aquí"
              subtitle="Añade fotos para empezar este recuerdo"
            />
            {/* Primary CTA for empty state */}
            <div className="mt-8 max-w-sm mx-auto">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Añadir tus primeras fotos
              </Button>
            </div>
          </div>
        ) : (
          <PhotoGrid
            photos={photos}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onSelectPhoto={onSelectPhoto}
            onToggleSelect={toggleSelect}
            onLongPress={handleLongPress}
          />
        )}
      </div>

      <SimpleFAB
        label="Subir fotos"
        icon={<Plus className="w-5 h-5" />}
        onClick={() => fileInputRef.current?.click()}
        hidden={selectionMode}
      />

      {/* Batch action bar */}
      {selectionMode && selectedIds.size > 0 && moveableAlbums.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30">
          <div className="max-w-2xl mx-auto px-6 py-4 flex gap-3">
            <button
              onClick={() => setShowBatchMoveModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <FolderInput className="w-4 h-4 text-muted-foreground" />
              Mover
            </button>
          </div>
        </div>
      )}

      {/* Batch move modal */}
      {showBatchMoveModal && (
        <MoveModal
          title={`Mover ${selectedIds.size} ${selectedIds.size === 1 ? 'foto' : 'fotos'}`}
          albums={moveableAlbums}
          selectedId={batchMoveTargetId}
          onSelect={setBatchMoveTargetId}
          onCancel={() => setShowBatchMoveModal(false)}
          onConfirm={handleBatchMoveSubmit}
        />
      )}
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
    <button
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
        alt={photo.caption || 'Foto'}
        className="w-full h-full object-cover pointer-events-none"
        draggable={false}
      />
      {(photo.recuerdoCount || 0) > 0 && !selectionMode && (
        <div className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-75 group-hover:opacity-90 transition-opacity">
          <MessageCircle className="w-3.5 h-3.5 text-foreground/70" strokeWidth={1.5} />
        </div>
      )}
      {selectionMode && (
        <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected ? 'bg-primary border-primary' : 'bg-background/60 border-white'
        }`}>
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>
      )}
    </button>
  );
}

// ─── Shared move-to-album modal ────────────────────────────────────────────────
export function MoveModal({
  title,
  albums,
  selectedId,
  onSelect,
  onCancel,
  onConfirm,
}: {
  title: string;
  albums: Album[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-foreground/40 z-[60] flex items-end justify-center">
      <div className="absolute inset-0" onClick={onCancel} />
      <div className="bg-background rounded-t-2xl w-full max-w-md p-6 relative z-10 animate-slide-up">
        <h2 className="text-lg font-medium text-foreground mb-4">{title}</h2>
        <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
          {albums.map(a => (
            <button key={a.id} onClick={() => onSelect(a.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                selectedId === a.id ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-secondary/30'
              }`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                selectedId === a.id ? 'bg-primary border-primary' : 'border-border'
              }`}>
                {selectedId === a.id && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm text-foreground">{a.name}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={!selectedId} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
            Mover aquí
          </button>
        </div>
      </div>
    </div>
  );
}
