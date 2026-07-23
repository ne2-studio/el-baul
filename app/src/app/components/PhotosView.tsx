import React, { useEffect, useRef, useState } from 'react';
import { useElementHeight } from '@/hooks/useElementHeight';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { SimpleFAB } from './FAB';
import { EditInfoModal } from './EditInfoModal';
import { MoveModal } from './MoveModal';
import { DateModal } from './DateModal';
import { BatchOperationProgress, BatchOperationItem } from './BatchOperationProgress';
import { TabButton } from './TabButton';
import { ChevronLeft, Plus, ImageIcon, MessageCircle, Check, FolderInput, Calendar, MoreVertical, Pencil, Trash2, BookOpen, X } from 'lucide-react';
import { Album } from './AlbumsView';
import { SelectedPhoto, materializeSelectedPhoto } from './UploadConfirmationScreen';
import { DeleteAlbumModal } from './DeleteAlbumModal';
import { PhotoDate } from '@/types';
import { formatDateRange } from '../utils/timeUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  sharedUserId?: string;
  userName: string;
  userAvatar?: string;
  createdAt: string;
  isOwn?: boolean;
  photoId?: string;
  photoThumbnailUrl?: string;
}

interface PhotosViewProps {
  album: Album;
  photos: Photo[];
  onBack: () => void;
  onSelectPhoto: (photo: Photo) => void;
  onAddPhotos: (selectedPhotos: SelectedPhoto[]) => void;
  /** Se llama cuando alguna foto elegida no se pudo leer (p. ej. el permiso content:// de
   * Android caducó) y por tanto se ha excluido en silencio de la selección. */
  onPhotosDropped?: (count: number) => void;
  allAlbums?: Album[];
  onBatchMove?: (
    photoIds: string[],
    targetAlbumId: string,
    onItemSettled?: (result: { photoId: string; error?: string }) => void
  ) => Promise<void>;
  onBatchChangeDate?: (photoIds: string[], date: PhotoDate) => Promise<boolean>;
  onBatchCreateChapter?: (photoIds: string[], name: string) => Promise<boolean>;
  onUpdateAlbumInfo?: (name: string) => Promise<boolean>;
  onDeleteAlbum?: () => Promise<boolean>;
  recuerdos?: Recuerdo[];
  onAddRecuerdo?: (text: string) => void;
  onUserClick?: (sharedUserId: string) => void;
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
  album, photos, onBack, onSelectPhoto, onAddPhotos, onPhotosDropped, allAlbums = [], onBatchMove, onBatchChangeDate,
  onBatchCreateChapter, onUpdateAlbumInfo, onDeleteAlbum, recuerdos = [], onAddRecuerdo, onUserClick,
}: PhotosViewProps) {
  const hasRecuerdosTab = !!onAddRecuerdo;
  const totalRecuerdos = hasRecuerdosTab ? recuerdos.length : photos.reduce((sum, photo) => sum + (photo.recuerdoCount || 0), 0);
  const sortedRecuerdos = [...recuerdos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const [activeTab, setActiveTab] = useState<'fotos' | 'recuerdos'>('fotos');
  const [showWriteRecuerdoModal, setShowWriteRecuerdoModal] = useState(false);
  const [writeRecuerdoText, setWriteRecuerdoText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [headerRef, headerHeight] = useElementHeight<HTMLDivElement>();
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSavingAlbumInfo, setIsSavingAlbumInfo] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingAlbum, setIsDeletingAlbum] = useState(false);

  const handleSaveAlbumInfo = async (name: string) => {
    setIsSavingAlbumInfo(true);
    const ok = (await onUpdateAlbumInfo?.(name)) ?? false;
    setIsSavingAlbumInfo(false);
    if (ok) setShowEditModal(false);
  };

  const handleDeleteAlbum = async () => {
    setIsDeletingAlbum(true);
    const ok = (await onDeleteAlbum?.()) ?? false;
    setIsDeletingAlbum(false);
    if (ok) setShowDeleteModal(false);
  };

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
  const [batchMoveItems, setBatchMoveItems] = useState<BatchOperationItem[] | null>(null);
  const [showBatchDateModal, setShowBatchDateModal] = useState(false);
  const [isBatchDateSubmitting, setIsBatchDateSubmitting] = useState(false);
  const [showBatchCreateChapterModal, setShowBatchCreateChapterModal] = useState(false);
  const [isBatchCreatingChapter, setIsBatchCreatingChapter] = useState(false);

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

  const handleBatchMoveSubmit = async () => {
    if (!batchMoveTargetId || !onBatchMove) return;
    const targetAlbumId = batchMoveTargetId;
    const ids = Array.from(selectedIds);
    setShowBatchMoveModal(false);
    setBatchMoveTargetId('');
    setBatchMoveItems(
      ids.map((id) => ({
        id,
        thumbnailUrl: photos.find((p) => p.id === id)?.thumbnailUrl ?? '',
        status: 'pending' as const,
      }))
    );

    await onBatchMove(ids, targetAlbumId, (result) => {
      setBatchMoveItems((prev) =>
        prev?.map((item) =>
          item.id === result.photoId ? { ...item, status: result.error ? ('error' as const) : ('success' as const) } : item
        ) ?? prev
      );
    });

    setBatchMoveItems(null);
    exitSelection();
  };

  const handleBatchDateSubmit = async (date: PhotoDate) => {
    if (!onBatchChangeDate) return;
    setIsBatchDateSubmitting(true);
    const ok = await onBatchChangeDate(Array.from(selectedIds), date);
    setIsBatchDateSubmitting(false);
    if (ok) {
      setShowBatchDateModal(false);
      exitSelection();
    }
  };

  const handleBatchCreateChapterSave = async (name: string) => {
    if (!onBatchCreateChapter) return;
    setIsBatchCreatingChapter(true);
    const ok = await onBatchCreateChapter(Array.from(selectedIds), name);
    setIsBatchCreatingChapter(false);
    if (ok) {
      setShowBatchCreateChapterModal(false);
      exitSelection();
    }
  };

  const moveableAlbums = allAlbums.filter(a => a.id !== album.id);

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

  const handleSaveRecuerdo = () => {
    const text = writeRecuerdoText.trim();
    if (!text) return;
    onAddRecuerdo?.(text);
    setShowWriteRecuerdoModal(false);
    setWriteRecuerdoText('');
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
            ) : onUpdateAlbumInfo && (
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
                  <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar información del capítulo
                  </DropdownMenuItem>
                  {onDeleteAlbum && (
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
          {(album.featuredCoverPhotoUrl ?? album.coverPhotoUrl) ? (
            <img
              src={album.featuredCoverPhotoUrl ?? album.coverPhotoUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/30 to-foreground/50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 pb-5">
            <div className="max-w-2xl mx-auto px-6">
              <h1 className="text-3xl font-serif text-white leading-tight" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}>
                {album.name}
              </h1>
              {album.minDate && album.maxDate && (
                <p className="text-xs text-white/65 mt-1 font-medium tracking-wide">
                  {formatDateRange(album.minDate, album.maxDate)}
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
            <div className="space-y-6">
              {groupPhotos(photos).map((group) => (
                <div key={group.label}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2"
                    style={{ fontSize: '0.68rem', letterSpacing: '0.08em' }}>
                    {group.label}
                  </p>
                  <PhotoGrid
                    photos={group.photos}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    onSelectPhoto={onSelectPhoto}
                    onToggleSelect={toggleSelect}
                    onLongPress={handleLongPress}
                  />
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'recuerdos' && hasRecuerdosTab && (
          sortedRecuerdos.length === 0 ? (
            <div className="py-12 text-center max-w-xs mx-auto">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-primary/60" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-serif text-foreground mb-2">Aún no hay recuerdos escritos</h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Los recuerdos escritos por la familia harán que este capítulo cobre vida.
              </p>
              <button
                onClick={() => setShowWriteRecuerdoModal(true)}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Escribe el primer recuerdo
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedRecuerdos.map((recuerdo) => (
                <RecuerdoFeedCard
                  key={recuerdo.id}
                  recuerdo={recuerdo}
                  onPhotoClick={
                    recuerdo.photoId
                      ? () => {
                          const photo = photos.find((p) => p.id === recuerdo.photoId);
                          if (photo) onSelectPhoto(photo);
                        }
                      : undefined
                  }
                  onUserClick={onUserClick}
                />
              ))}
            </div>
          )
        )}
      </div>

      <SimpleFAB
        label={activeTab === 'recuerdos' ? 'Escribe lo que recuerdas' : 'Subir fotos'}
        icon={activeTab === 'recuerdos' ? <BookOpen className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        onClick={() => activeTab === 'recuerdos' ? setShowWriteRecuerdoModal(true) : fileInputRef.current?.click()}
        hidden={selectionMode}
      />

      {/* Batch action bar */}
      {selectionMode && selectedIds.size > 0 && (onBatchChangeDate || moveableAlbums.length > 0 || onBatchCreateChapter) && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30">
          <div className="max-w-2xl mx-auto px-6 py-4 flex gap-3">
            {onBatchChangeDate && (
              <button
                onClick={() => setShowBatchDateModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Cambiar fecha
              </button>
            )}
            {moveableAlbums.length > 0 && (
              <button
                onClick={() => setShowBatchMoveModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <FolderInput className="w-4 h-4 text-muted-foreground" />
                Mover
              </button>
            )}
            {onBatchCreateChapter && (
              <button
                onClick={() => setShowBatchCreateChapterModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
                Crear nuevo capítulo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Batch date modal */}
      {showBatchDateModal && (
        <DateModal
          title={`Cambiar fecha · ${selectedIds.size} ${selectedIds.size === 1 ? 'foto' : 'fotos'}`}
          onCancel={() => setShowBatchDateModal(false)}
          onConfirm={handleBatchDateSubmit}
          isSubmitting={isBatchDateSubmitting}
        />
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

      {/* Progreso ítem a ítem mientras se mueve el lote (una petición por foto) */}
      {batchMoveItems && (
        <BatchOperationProgress title="Moviendo fotos..." items={batchMoveItems} />
      )}

      {/* Batch create-chapter modal */}
      {showBatchCreateChapterModal && (
        <EditInfoModal
          title="Nuevo capítulo"
          initialName=""
          namePlaceholder="Nombre del capítulo"
          onCancel={() => setShowBatchCreateChapterModal(false)}
          onSave={handleBatchCreateChapterSave}
          isSubmitting={isBatchCreatingChapter}
        />
      )}

      {showEditModal && (
        <EditInfoModal
          title="Editar información del capítulo"
          initialName={album.name}
          namePlaceholder="Nombre del capítulo"
          onCancel={() => setShowEditModal(false)}
          onSave={handleSaveAlbumInfo}
          isSubmitting={isSavingAlbumInfo}
        />
      )}

      {showDeleteModal && (
        <DeleteAlbumModal
          photoCount={photos.length}
          recuerdoCount={recuerdos.length}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAlbum}
          isSubmitting={isDeletingAlbum}
        />
      )}

      {showWriteRecuerdoModal && (
        <WriteRecuerdoModal
          text={writeRecuerdoText}
          onTextChange={setWriteRecuerdoText}
          onCancel={() => setShowWriteRecuerdoModal(false)}
          onSave={handleSaveRecuerdo}
        />
      )}
    </div>
  );
}

// ─── Recuerdo feed card ───────────────────────────────────────────────────────
function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function RecuerdoFeedCard({
  recuerdo, onPhotoClick, onUserClick,
}: { recuerdo: Recuerdo; onPhotoClick?: () => void; onUserClick?: (sharedUserId: string) => void }) {
  const userName = recuerdo.isOwn ? 'Yo' : (recuerdo.userName || 'Usuario desconocido');
  const canOpenPersona = !!(recuerdo.sharedUserId && onUserClick);

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={canOpenPersona ? () => onUserClick!(recuerdo.sharedUserId!) : undefined}
          disabled={!canOpenPersona}
          className={`w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 overflow-hidden ${canOpenPersona ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
        >
          {recuerdo.userAvatar ? (
            <img src={recuerdo.userAvatar} alt={userName} className="w-full h-full object-cover rounded-full" />
          ) : (
            getInitials(userName)
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm font-medium text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground shrink-0">{new Date(recuerdo.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed font-serif">{recuerdo.text}</p>
          {recuerdo.photoThumbnailUrl && (
            <button
              onClick={onPhotoClick}
              className="mt-3 block rounded-xl overflow-hidden hover:opacity-90 transition-opacity"
            >
              <img src={recuerdo.photoThumbnailUrl} alt="" className="w-full max-h-36 object-cover rounded-xl" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Write recuerdo modal ───────────────────────────────────────────────────────
function WriteRecuerdoModal({
  text,
  onTextChange,
  onCancel,
  onSave,
}: {
  text: string;
  onTextChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-foreground/40 z-[60] flex items-end justify-center">
      <div className="absolute inset-0" onClick={onCancel} />
      <div className="bg-background rounded-t-2xl w-full max-w-md p-6 relative z-10 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-foreground">Escribe lo que recuerdas</h2>
          <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-secondary transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          rows={5}
          placeholder="¿Qué recuerdas de este momento? Escríbelo para que la familia lo guarde…"
          className="w-full border border-border rounded-2xl px-4 py-3 text-sm text-foreground bg-card outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground/60 leading-relaxed"
        />
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!text.trim()}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            Guardar recuerdo
          </button>
        </div>
      </div>
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

