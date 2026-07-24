import React, { useRef, useState } from 'react';
import { useElementHeight } from '@/hooks/useElementHeight';
import { EmptyState } from './EmptyState';
import { SimpleFAB } from './FAB';
import { EditInfoModal } from './EditInfoModal';
import { TabButton } from './TabButton';
import { ChevronLeft, Plus, ImageIcon, MessageCircle, Check, CheckSquare, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Chapter } from './ChaptersView';
import { SelectedPhoto, materializeSelectedPhoto } from './UploadConfirmationScreen';
import { DeleteChapterModal } from './DeleteChapterModal';
import { RecuerdosFeed } from './RecuerdosFeed';
import { BatchPhotoActionsBar } from './BatchPhotoActionsBar';
import { PhotoDate } from '@/types';
import { formatDateRange } from '../utils/timeUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export interface Photo {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  date?: PhotoDate;
  recuerdoCount?: number;
}

export interface Recuerdo {
  id: string;
  text: string;
  personaId?: string;
  userName: string;
  userAvatar?: string;
  createdAt: string;
  isOwn?: boolean;
  photoId?: string;
  photoThumbnailUrl?: string;
}

interface PhotosViewProps {
  chapter: Chapter;
  photos: Photo[];
  onBack: () => void;
  onSelectPhoto: (photo: Photo) => void;
  onAddPhotos: (selectedPhotos: SelectedPhoto[]) => void;
  /** Se llama cuando alguna foto elegida no se pudo leer (p. ej. el permiso content:// de
   * Android caducó) y por tanto se ha excluido en silencio de la selección. */
  onPhotosDropped?: (count: number) => void;
  allChapters?: Chapter[];
  onBatchMove?: (
    photoIds: string[],
    targetChapterId: string,
    onItemSettled?: (result: { photoId: string; error?: string }) => void
  ) => Promise<void>;
  onBatchChangeDate?: (photoIds: string[], date: PhotoDate) => Promise<boolean>;
  onBatchCreateChapter?: (photoIds: string[], name: string) => Promise<boolean>;
  onUpdateChapterInfo?: (name: string) => Promise<boolean>;
  onDeleteChapter?: () => Promise<boolean>;
  recuerdos?: Recuerdo[];
  onAddRecuerdo?: (text: string) => void;
  onUserClick?: (personaId: string) => void;
}

// Groups photos by year+month (or by year alone, when only a year is known — never
// assume a month for display, that defaulting only applies to sorting), oldest first so
// the baúl reads like a story, with a trailing "Sin fecha" group for anything undated.
function groupPhotos(photos: Photo[]): { label: string; photos: Photo[] }[] {
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

export function PhotosView({
  chapter, photos, onBack, onSelectPhoto, onAddPhotos, onPhotosDropped, allChapters = [], onBatchMove, onBatchChangeDate,
  onBatchCreateChapter, onUpdateChapterInfo, onDeleteChapter, recuerdos = [], onAddRecuerdo, onUserClick,
}: PhotosViewProps) {
  const hasRecuerdosTab = !!onAddRecuerdo;
  const totalRecuerdos = hasRecuerdosTab ? recuerdos.length : photos.reduce((sum, photo) => sum + (photo.recuerdoCount || 0), 0);
  const [activeTab, setActiveTab] = useState<'fotos' | 'recuerdos'>('fotos');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSavingChapterInfo, setIsSavingChapterInfo] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingChapter, setIsDeletingChapter] = useState(false);

  const handleSaveChapterInfo = async (name: string) => {
    setIsSavingChapterInfo(true);
    const ok = (await onUpdateChapterInfo?.(name)) ?? false;
    setIsSavingChapterInfo(false);
    if (ok) setShowEditModal(false);
  };

  const handleDeleteChapter = async () => {
    setIsDeletingChapter(true);
    const ok = (await onDeleteChapter?.()) ?? false;
    setIsDeletingChapter(false);
    if (ok) setShowDeleteModal(false);
  };

  // Multi-selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      setSelectionMode(next.size > 0);
      return next;
    });
  };

  const handleLongPress = (photoId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([photoId]));
  };

  // Toggles an entire month-group at once (swimlane click): selects it fully unless
  // every photo in it is already selected, in which case it deselects the group.
  const handleToggleGroup = (groupPhotos: Photo[]) => {
    const groupIds = groupPhotos.map(p => p.id);
    const allSelected = groupIds.length > 0 && groupIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      groupIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
      setSelectionMode(next.size > 0);
      return next;
    });
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const moveableChapters = allChapters.filter(a => a.id !== chapter.id);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    e.target.value = ''; // must run after snapshotting — files is a live FileList tied to the input

    const materialized = await Promise.all(fileArray.map(materializeSelectedPhoto));
    const selectedPhotos = materialized.filter((photo): photo is SelectedPhoto => photo !== null);
    if (materialized.length > selectedPhotos.length) {
      onPhotosDropped?.(materialized.length - selectedPhotos.length);
    }
    if (selectedPhotos.length === 0) return;

    onAddPhotos(selectedPhotos);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header — back + actions */}
      <div ref={headerRef} className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={selectionMode ? exitSelection : onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">{selectionMode ? 'Cancelar' : 'Volver'}</span>
            </button>

            {selectionMode ? (
              <span className="text-sm font-medium text-foreground">
                {selectedIds.size} {selectedIds.size === 1 ? 'seleccionada' : 'seleccionadas'}
              </span>
            ) : onUpdateChapterInfo && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
                    aria-label="Opciones del capítulo"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setSelectionMode(true)}>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Seleccionar fotos
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar información del capítulo
                  </DropdownMenuItem>
                  {onDeleteChapter && (
                    <DropdownMenuItem variant="destructive" onClick={() => setShowDeleteModal(true)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar capítulo
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Hero — shown when not in selection mode */}
      {!selectionMode && (
        <div className="relative overflow-hidden" style={{ height: '210px' }}>
          {(chapter.featuredCoverPhotoUrl ?? chapter.coverPhotoUrl) ? (
            <img
              src={chapter.featuredCoverPhotoUrl ?? chapter.coverPhotoUrl}
              alt=""
              className="hero-cover-image absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/30 to-foreground/50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 pb-5">
            <div className="max-w-2xl mx-auto px-6">
              <h1 className="text-3xl font-serif text-white leading-tight" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}>
                {chapter.name}
              </h1>
              {chapter.minDate && chapter.maxDate && (
                <p className="text-xs text-white/65 mt-1 font-medium tracking-wide">
                  {formatDateRange(chapter.minDate, chapter.maxDate)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Tabs — only when the caller supports a Recuerdos feed (real chapters, not the loose-photos virtual one) */}
      {!selectionMode && hasRecuerdosTab && (
        <div
          className="sticky bg-background/90 backdrop-blur-sm z-[9] border-b border-border"
          style={{ top: headerHeight }}
        >
          <div className="max-w-2xl mx-auto px-6">
            <div className="flex">
              <TabButton label="Fotos" count={photos.length} active={activeTab === 'fotos'} onClick={() => setActiveTab('fotos')} />
              <TabButton label="Recuerdos" count={recuerdos.length} active={activeTab === 'recuerdos'} onClick={() => setActiveTab('recuerdos')} />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6 pb-28">
        {!selectionMode && !hasRecuerdosTab && totalRecuerdos > 0 && (
          <div className="flex items-center gap-1.5 mb-5 -mt-1">
            <MessageCircle className="w-3.5 h-3.5 text-muted-foreground/60" strokeWidth={1.5} />
            <span className="text-xs text-muted-foreground/75">
              {totalRecuerdos} {totalRecuerdos === 1 ? 'recuerdo' : 'recuerdos'} en este capítulo
            </span>
          </div>
        )}

        {activeTab === 'fotos' && (
          photos.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="w-20 h-20" strokeWidth={1.5} />}
              title="Todavía no hay fotos aquí"
              subtitle="Añade fotos para empezar este recuerdo"
            />
          ) : (
            <div className="space-y-6">
              {groupPhotos(photos).map((group) => {
                const groupAllSelected = group.photos.every((p) => selectedIds.has(p.id));
                return (
                <div key={group.label}>
                  <button
                    type="button"
                    onClick={() => handleToggleGroup(group.photos)}
                    className="group/swimlane flex items-center gap-1.5 mb-2 -ml-0.5 px-0.5 py-0.5 rounded"
                  >
                    {selectionMode && (
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${
                        groupAllSelected ? 'bg-primary border-primary' : 'bg-background/60 border-muted-foreground/40'
                      }`}>
                        {groupAllSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground uppercase tracking-wide group-hover/swimlane:text-foreground transition-colors"
                      style={{ fontSize: '0.68rem', letterSpacing: '0.08em' }}>
                      {group.label}
                    </p>
                  </button>
                  <PhotoGrid
                    photos={group.photos}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    onSelectPhoto={onSelectPhoto}
                    onToggleSelect={toggleSelect}
                    onLongPress={handleLongPress}
                  />
                </div>
                );
              })}
            </div>
          )
        )}

        {hasRecuerdosTab && (
          <RecuerdosFeed
            active={activeTab === 'recuerdos'}
            photos={photos}
            recuerdos={recuerdos}
            onSelectPhoto={onSelectPhoto}
            onAddRecuerdo={onAddRecuerdo}
            onUserClick={onUserClick}
            selectionMode={selectionMode}
          />
        )}
      </div>

      <SimpleFAB
        label="Subir fotos"
        icon={<Plus className="w-5 h-5" />}
        onClick={() => fileInputRef.current?.click()}
        hidden={activeTab !== 'fotos' || selectionMode}
      />

      <BatchPhotoActionsBar
        active={selectionMode}
        photos={photos}
        selectedIds={selectedIds}
        moveableChapters={moveableChapters}
        onBatchMove={onBatchMove}
        onBatchChangeDate={onBatchChangeDate}
        onBatchCreateChapter={onBatchCreateChapter}
        onDone={exitSelection}
      />

      {showEditModal && (
        <EditInfoModal
          title="Editar información del capítulo"
          initialName={chapter.name}
          namePlaceholder="Nombre del capítulo"
          onCancel={() => setShowEditModal(false)}
          onSave={handleSaveChapterInfo}
          isSubmitting={isSavingChapterInfo}
        />
      )}

      {showDeleteModal && (
        <DeleteChapterModal
          photoCount={photos.length}
          recuerdoCount={recuerdos.length}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteChapter}
          isSubmitting={isDeletingChapter}
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
          selectionMode ? onToggleSelect(photo.id) : onLongPress(photo.id);
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
    </button>
  );
}

